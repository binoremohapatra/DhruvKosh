from app.utils.storage import upload_to_cloud_if_configured
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import MediaItem
from app.schemas import MediaItemCreate, MediaItemResponse
from app.utils import generate_thumbnail_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

@router.post("/{expedition_id}/media", response_model=MediaItemResponse)
async def upload_media(
    expedition_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    media_type: str = Form(...),
    capture_date: Optional[str] = Form(None),
    location_description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    photographer_credit: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    allowed = ALLOWED_IMAGE_TYPES if media_type == "photo" else ALLOWED_VIDEO_TYPES
    if not validate_file_type(content, allowed):
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid {media_type} type.")
    
    media_dir = os.path.join(UPLOAD_DIR, "media", str(expedition_id), media_type)
    os.makedirs(media_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(media_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)
    
    thumbnail_path = None
    if media_type == "photo":
        thumb_dir = os.path.join(media_dir, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"thumb_{unique_filename}.jpg"
        thumbnail_full_path = os.path.join(thumb_dir, thumb_filename)
        if generate_thumbnail_safe(file_path, thumbnail_full_path):
            thumbnail_path = thumbnail_full_path
    
    tags_list = [t.strip() for t in tags.split(",")] if tags else None
    
    try:
        media = MediaItem(
            expedition_id=expedition_id,
            title=title,
            description=description,
            media_type=media_type,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            capture_date=capture_date,
            location_description=location_description,
            latitude=latitude,
            longitude=longitude,
            photographer_credit=photographer_credit,
            tags=tags_list
        )
        db.add(media)
        db.commit()
        db.refresh(media)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        if thumbnail_path and os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        raise HTTPException(status_code=500, detail=f"Failed to create media item: {str(e)}")
    
    return media

@router.get("/{media_id}", response_model=MediaItemResponse)
def get_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    return media

@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    
    if os.path.exists(media.file_path):
        os.remove(media.file_path)
    if media.thumbnail_path and os.path.exists(media.thumbnail_path):
        os.remove(media.thumbnail_path)
            
    db.delete(media)
    db.commit()
    return {"message": "Deleted successfully"}
