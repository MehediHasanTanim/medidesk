from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver


def _get_client_ip(request) -> str:
    if request is None:
        return ""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or ""


@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    from infrastructure.services.audit_service import get_audit_service
    get_audit_service().log(
        action="LOGIN",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=_get_client_ip(request),
    )


@receiver(user_logged_out)
def on_logout(sender, request, user, **kwargs):
    if user is None:
        return
    from infrastructure.services.audit_service import get_audit_service
    get_audit_service().log(
        action="LOGOUT",
        resource_type="user",
        resource_id=str(user.id),
        user_id=user.id,
        ip_address=_get_client_ip(request),
    )
