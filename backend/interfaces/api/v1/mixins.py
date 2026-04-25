from infrastructure.services.audit_service import get_audit_service

_METHOD_TO_ACTION = {
    "POST": "CREATE",
    "PUT": "UPDATE",
    "PATCH": "UPDATE",
    "DELETE": "DELETE",
}


def _get_client_ip(request) -> str:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or ""


def _resource_id_from_response(data) -> str:
    if not isinstance(data, dict):
        return ""
    if "id" in data:
        return str(data["id"])
    # Some responses use domain-specific keys (prescription_id, invoice_id, …)
    for k, v in data.items():
        if k.endswith("_id") and v:
            return str(v)
    return ""


def _resource_id_from_kwargs(kwargs: dict) -> str:
    for k, v in kwargs.items():
        if k == "pk" or k.endswith("_id"):
            return str(v)
    return ""


class AuditMixin:
    """Add to any APIView to auto-log CREATE / UPDATE / DELETE events."""

    audit_resource_type: str = ""

    def finalize_response(self, request, response, *args, **kwargs):
        resp = super().finalize_response(request, response, *args, **kwargs)  # type: ignore[misc]
        if request.method in _METHOD_TO_ACTION and resp.status_code < 400:
            action = _METHOD_TO_ACTION[request.method]
            response_data = getattr(resp, "data", None)

            if action == "CREATE":
                # Prefer the newly created resource ID from the response body
                resource_id = _resource_id_from_response(response_data)
                if not resource_id:
                    resource_id = _resource_id_from_kwargs(kwargs)
            else:
                resource_id = _resource_id_from_kwargs(kwargs)

            get_audit_service().log(
                action=action,
                resource_type=self.audit_resource_type,
                resource_id=resource_id,
                user_id=request.user.id if request.user.is_authenticated else None,
                ip_address=_get_client_ip(request),
                payload={"method": request.method, "path": request.path},
            )
        return resp
