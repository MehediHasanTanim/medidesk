from django.apps import AppConfig


class InfrastructureConfig(AppConfig):
    name = "infrastructure"
    label = "infrastructure"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        pass  # signal registrations go here
