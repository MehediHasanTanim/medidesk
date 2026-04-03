from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT payload with role and full_name so the frontend
    can decode user identity directly from the token without a /me round-trip.
    """

    @classmethod
    def get_token(cls, user) -> Token:
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Also include user info in the login response body
        data["user"] = {
            "id": str(self.user.id),
            "username": self.user.username,
            "full_name": self.user.full_name,
            "email": self.user.email,
            "role": self.user.role,
        }
        return data


# ── Inline serializers for Swagger documentation ──────────────────────────────

class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(help_text="Staff login username")
    password = serializers.CharField(
        style={"input_type": "password"},
        help_text="Account password",
    )


class LoginUserSerializer(serializers.Serializer):
    id        = serializers.UUIDField()
    username  = serializers.CharField()
    full_name = serializers.CharField()
    email     = serializers.EmailField()
    role      = serializers.CharField()


class LoginResponseSerializer(serializers.Serializer):
    access  = serializers.CharField(help_text="Short-lived JWT access token (8 h)")
    refresh = serializers.CharField(help_text="Long-lived JWT refresh token (7 d)")
    user    = LoginUserSerializer()


class TokenRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text="A valid refresh token")


class TokenRefreshResponseSerializer(serializers.Serializer):
    access  = serializers.CharField(help_text="New access token")
    refresh = serializers.CharField(help_text="Rotated refresh token")


class TokenBlacklistRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text="Refresh token to invalidate (logout)")


class MeSerializer(serializers.Serializer):
    id          = serializers.UUIDField()
    username    = serializers.CharField()
    full_name   = serializers.CharField()
    email       = serializers.EmailField()
    role        = serializers.CharField()
    chamber_ids = serializers.ListField(child=serializers.UUIDField())
    is_active   = serializers.BooleanField()


class MeUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, help_text="Update display name")
    email     = serializers.EmailField(required=False, help_text="Update email address")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        style={"input_type": "password"},
        help_text="Current password",
    )
    new_password = serializers.CharField(
        style={"input_type": "password"},
        help_text="New password (min 8 chars)",
    )


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()
