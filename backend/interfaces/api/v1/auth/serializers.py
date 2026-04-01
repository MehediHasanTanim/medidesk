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
