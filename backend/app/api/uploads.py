from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.services.auth import verify_firebase_token
from app.services.storage import UPLOAD_BASE

router = APIRouter()

UPLOADS_ROOT = Path(UPLOAD_BASE).resolve()


@router.get("/{file_path:path}")
async def serve_upload(
    file_path: str,
    _=Depends(verify_firebase_token),
):
    resolved = (UPLOADS_ROOT / file_path).resolve()
    if not str(resolved).startswith(str(UPLOADS_ROOT)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(resolved)
