import os
import time
import requests as http_requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jwt import PyJWT, PyJWKClient
from app.database import get_db
from app.models.user import User

load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

# PyJWKClient handles fetching and caching Firebase's public keys
_jwks_client = PyJWKClient(FIREBASE_JWKS_URL, cache_keys=True)

bearer_scheme = HTTPBearer()


def _decode_firebase_token(token: str) -> dict:
    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    return PyJWT().decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
    )


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        decoded = _decode_firebase_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    firebase_uid = decoded.get("uid")
    user = db.query(User).filter(
        User.firebase_uid == firebase_uid,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account not found or inactive",
        )

    return user


def require_role(allowed_roles: list[str]):
    async def dependency(current_user: User = Depends(verify_firebase_token)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized for this action",
            )
        return current_user
    return dependency
