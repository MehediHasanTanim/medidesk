from rest_framework_simplejwt.authentication import JWTAuthentication


class QueryParamJWTAuthentication(JWTAuthentication):
    """JWT auth that also accepts a bare token via ?token= query param.

    EventSource (browser SSE API) cannot set custom headers, so we fall back
    to reading the access token from the query string when the Authorization
    header is absent.  Used exclusively by SSE endpoints.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.query_params.get("token")
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
