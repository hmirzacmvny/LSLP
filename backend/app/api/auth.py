from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.auth import verify_firebase_token

router = APIRouter()


@router.get("/me")
def get_current_user(user: User = Depends(verify_firebase_token)):
    return {
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "initials": user.initials,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
