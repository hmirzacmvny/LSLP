import os
import shutil
import uuid
from fastapi import UploadFile

# Base folder where all uploads live
UPLOAD_BASE = r"C:\lslp\backend\uploads"

def save_photo(file: UploadFile, folder: str, account_number: str) -> str:
    """
    Saves an uploaded photo to the local filesystem.
    Returns the file path as a string.
    
    folder: "field" or "customer"
    account_number: e.g. "003518-000"
    
    Saved to:
    uploads/field/003518-000/uuid.jpg
    uploads/customer/003518-000/uuid.jpg
    
    When Firebase Storage is ready later:
    - Replace this function only
    - Return a Firebase URL instead of a local path
    - Nothing else in the codebase changes
    """
    # Create folder if it doesn't exist
    save_dir = os.path.join(UPLOAD_BASE, folder, account_number)
    os.makedirs(save_dir, exist_ok=True)

    # Generate a unique filename to avoid collisions
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(save_dir, filename)

    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return path relative to uploads root for portability
    return os.path.relpath(file_path, UPLOAD_BASE).replace("\\", "/")


def delete_photo(file_path: str) -> bool:
    """
    Deletes a photo from local storage.
    When migrating to Firebase, replace this to delete from bucket instead.
    """
    try:
        full = file_path if os.path.isabs(file_path) else os.path.join(UPLOAD_BASE, file_path)
        if os.path.exists(full):
            os.remove(full)
            return True
        return False
    except Exception:
        return False
