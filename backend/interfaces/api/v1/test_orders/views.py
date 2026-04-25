import uuid
from datetime import datetime
from typing import Any, Dict

from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from interfaces.api.v1.test_orders.serializers import (
    BulkCreateTestOrderSerializer,
    TestOrderResponseSerializer,
    UpdateTestOrderSerializer,
)
from interfaces.api.v1.mixins import AuditMixin
from interfaces.permissions import ConsultationOwnershipMixin, ModulePermission, RolePermission


# ── Helper ────────────────────────────────────────────────────────────────────

def _order_to_dict(order) -> Dict[str, Any]:
    patient = getattr(order, "patient", None)
    return {
        "id": str(order.id),
        "consultation_id": str(order.consultation_id),
        "patient_id": str(order.patient_id),
        "patient_name": patient.full_name if patient else "",
        "test_name": order.test_name,
        "lab_name": order.lab_name or "",
        "notes": order.notes or "",
        "ordered_by_id": str(order.ordered_by_id) if order.ordered_by_id else None,
        "ordered_by_name": order.ordered_by.full_name if order.ordered_by else "",
        "ordered_at": order.ordered_at.isoformat() if order.ordered_at else None,
        "is_completed": order.is_completed,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "approval_status": order.approval_status,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@extend_schema(tags=["test-orders"])
class ConsultationTestOrdersView(AuditMixin, ConsultationOwnershipMixin, APIView):
    """
    GET  /consultations/<id>/test-orders/  — list test orders for a consultation
    POST /consultations/<id>/test-orders/  — add one or more test orders

    Doctor orders are auto-approved.
    Assistant-doctor orders start as "pending" and require doctor approval.
    """
    audit_resource_type = "test_order"
    permission_classes = [IsAuthenticated, ModulePermission("test_orders")]

    @extend_schema(
        summary="List test orders for a consultation",
        responses={200: TestOrderResponseSerializer(many=True)},
    )
    def get(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel
        from infrastructure.orm.models.consultation_model import ConsultationModel

        try:
            ConsultationModel.objects.get(id=consultation_id)
        except ConsultationModel.DoesNotExist:
            return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)

        orders = (
            TestOrderModel.objects
            .filter(consultation_id=consultation_id)
            .select_related("ordered_by")
        )
        return Response([_order_to_dict(o) for o in orders])

    @extend_schema(
        summary="Add lab test orders to a consultation",
        description=(
            "Order one or more lab tests. "
            "Doctor-ordered tests are immediately approved. "
            "Assistant-doctor-ordered tests are set to 'pending' and must be approved by a doctor."
        ),
        request=BulkCreateTestOrderSerializer,
        responses={201: TestOrderResponseSerializer(many=True)},
    )
    def post(self, request: Request, consultation_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel
        from infrastructure.orm.models.consultation_model import ConsultationModel

        role = getattr(request.user, "role", "")

        try:
            consultation = ConsultationModel.objects.get(id=consultation_id)
        except ConsultationModel.DoesNotExist:
            return Response({"error": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Assistant doctor may only add tests to consultations they started
        scope_err = self.check_consultation_scope(request, consultation.doctor_id)
        if scope_err:
            return scope_err

        serializer = BulkCreateTestOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data["orders"]

        if not items:
            return Response({"error": "Provide at least one order"}, status=status.HTTP_400_BAD_REQUEST)

        # Doctor orders are auto-approved; assistant_doctor orders need approval
        approval_status = "pending" if role == "assistant_doctor" else "approved"

        created = []
        for item in items:
            order = TestOrderModel.objects.create(
                id=uuid.uuid4(),
                consultation_id=consultation_id,
                patient_id=consultation.patient_id,
                test_name=item["test_name"].strip(),
                lab_name=item.get("lab_name", "").strip(),
                notes=item.get("notes", ""),
                ordered_by=request.user,
                approval_status=approval_status,
            )
            order.refresh_from_db()
            order.ordered_by = request.user
            created.append(_order_to_dict(order))

        return Response(created, status=status.HTTP_201_CREATED)


@extend_schema(tags=["test-orders"])
class TestOrderDetailView(AuditMixin, ConsultationOwnershipMixin, APIView):
    """
    PATCH  /test-orders/<id>/  — update lab_name, notes, completion status, or approval_status
    DELETE /test-orders/<id>/  — cancel / remove a test order

    Approval rules:
    - Doctor: can update any field (including approval_status) on any order.
    - Assistant doctor: can only edit/delete orders that are still "pending" in consultations
      they started. Cannot change approval_status.
    """
    audit_resource_type = "test_order"
    permission_classes = [IsAuthenticated, ModulePermission("test_orders")]

    @extend_schema(
        summary="Update a test order",
        description=(
            "Update lab_name, notes, completion status, or approval_status. "
            "Doctors can approve (approval_status='approved') or reject (approval_status='rejected') "
            "pending orders placed by assistant doctors. "
            "Assistant doctors can only edit their own pending orders."
        ),
        request=UpdateTestOrderSerializer,
        responses={200: TestOrderResponseSerializer},
    )
    def patch(self, request: Request, order_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel

        role = getattr(request.user, "role", "")

        try:
            order = TestOrderModel.objects.select_related("ordered_by", "consultation").get(id=order_id)
        except TestOrderModel.DoesNotExist:
            return Response({"error": "Test order not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateTestOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Scope: assistant_doctor may only edit orders in consultations they started
        scope_err = self.check_consultation_scope(request, order.consultation.doctor_id)
        if scope_err:
            return scope_err

        if role == "assistant_doctor":
            # Cannot touch already-reviewed orders
            if order.approval_status != "pending":
                return Response(
                    {"error": "Cannot modify an order that has already been approved or rejected"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Cannot set approval_status
            if "approval_status" in data:
                return Response(
                    {"error": "Only doctors can approve or reject test orders"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Apply field updates
        if "test_name" in data:
            order.test_name = data["test_name"].strip()
        if "lab_name" in data:
            order.lab_name = data["lab_name"].strip()
        if "notes" in data:
            order.notes = data["notes"]
        if "is_completed" in data:
            order.is_completed = data["is_completed"]
            if data["is_completed"] and not order.completed_at:
                order.completed_at = datetime.now()
            elif not data["is_completed"]:
                order.completed_at = None
        if "approval_status" in data:
            # Only doctors reach here (assistant_doctor blocked above)
            order.approval_status = data["approval_status"]

        order.save()
        return Response(_order_to_dict(order))

    @extend_schema(
        summary="Cancel / delete a test order",
        description=(
            "Permanently remove a test order. "
            "Doctors can delete any order. "
            "Assistant doctors can only delete pending orders in their own consultations."
        ),
        responses={204: None},
    )
    def delete(self, request: Request, order_id: uuid.UUID) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel

        role = getattr(request.user, "role", "")

        try:
            order = TestOrderModel.objects.select_related("consultation").get(id=order_id)
        except TestOrderModel.DoesNotExist:
            return Response({"error": "Test order not found"}, status=status.HTTP_404_NOT_FOUND)

        # Scope: assistant_doctor may only delete orders in consultations they started
        scope_err = self.check_consultation_scope(request, order.consultation.doctor_id)
        if scope_err:
            return scope_err

        if role == "assistant_doctor":
            if order.approval_status != "pending":
                return Response(
                    {"error": "Cannot delete an order that has already been approved or rejected"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["test-orders"])
class PatientTestOrdersView(APIView):
    """
    GET /test-orders/?patient_id=<uuid>[&consultation_id=<uuid>][&pending_only=true][&approval_status=<value>]
    """
    permission_classes = [IsAuthenticated, ModulePermission("test_orders")]

    @extend_schema(
        summary="List test orders for a patient",
        description=(
            "Returns all lab test orders for a patient, newest first. "
            "Filter by consultation_id, pending_only, or approval_status."
        ),
        parameters=[
            OpenApiParameter("patient_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("consultation_id", OpenApiTypes.UUID, required=False),
            OpenApiParameter("pending_only", OpenApiTypes.BOOL, required=False),
            OpenApiParameter("approval_status", OpenApiTypes.STR, required=False,
                             description="pending | approved | rejected"),
        ],
        responses={200: TestOrderResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel

        patient_id_str = request.query_params.get("patient_id")
        if not patient_id_str:
            return Response({"error": "patient_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient_id = uuid.UUID(patient_id_str)
        except ValueError:
            return Response({"error": "Invalid patient_id"}, status=status.HTTP_400_BAD_REQUEST)

        qs = TestOrderModel.objects.filter(patient_id=patient_id).select_related("ordered_by")

        consultation_id_str = request.query_params.get("consultation_id")
        if consultation_id_str:
            try:
                qs = qs.filter(consultation_id=uuid.UUID(consultation_id_str))
            except ValueError:
                return Response({"error": "Invalid consultation_id"}, status=status.HTTP_400_BAD_REQUEST)

        if request.query_params.get("pending_only", "false").lower() == "true":
            qs = qs.filter(is_completed=False)

        approval_status = request.query_params.get("approval_status")
        if approval_status:
            qs = qs.filter(approval_status=approval_status)

        return Response([_order_to_dict(o) for o in qs])


@extend_schema(tags=["test-orders"])
class MyTestOrdersView(APIView):
    """
    GET /test-orders/mine/  — test orders placed by the calling user (assistant_doctor only)
    """
    permission_classes = [IsAuthenticated, ModulePermission("test_orders"), RolePermission(["assistant_doctor"])]

    @extend_schema(
        summary="List my own test orders",
        description="Returns all test orders placed by the calling assistant doctor, newest first.",
        responses={200: TestOrderResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel

        qs = (
            TestOrderModel.objects
            .filter(ordered_by=request.user)
            .select_related("ordered_by", "patient")
            .order_by("-ordered_at")
        )
        return Response([_order_to_dict(o) for o in qs])


@extend_schema(tags=["test-orders"])
class PendingTestOrdersView(APIView):
    """
    GET /test-orders/pending/  — all test orders awaiting doctor approval (doctor only)
    """
    # test_orders.view is allowed for both doctor and assistant_doctor,
    # but this endpoint is doctor-only (approval queue); RolePermission narrows it.
    permission_classes = [IsAuthenticated, ModulePermission("test_orders"), RolePermission(["doctor"])]

    @extend_schema(
        summary="List all pending test orders",
        description="Returns every test order with approval_status='pending', newest first. Doctor-only.",
        responses={200: TestOrderResponseSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        from infrastructure.orm.models.test_order_model import TestOrderModel

        qs = (
            TestOrderModel.objects
            .filter(
                Q(approval_status="pending"),
                Q(consultation__doctor_id=request.user.id) |
                Q(ordered_by__supervisor_id=request.user.id),
            )
            .select_related("ordered_by", "patient")
            .order_by("-ordered_at")
        )
        return Response([_order_to_dict(o) for o in qs])
