from app.utils.storage import upload_to_cloud_if_configured
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import ScientificDataset
from app.schemas import ScientificDatasetCreate, ScientificDatasetResponse, DatasetPreview
from app.utils import generate_dataset_preview_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"

ALLOWED_FORMATS = {
    "csv": ["text/csv", "application/csv", "text/plain"],
    "excel": ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    "netcdf": ["application/x-netcdf", "application/octet-stream"],
    "shapefile": ["application/zip", "application/x-zip-compressed", "application/octet-stream"]
}

@router.post("", response_model=ScientificDatasetResponse)
async def upload_dataset(
    expedition_id: Optional[int] = Form(None),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    data_type: str = Form(...),
    file_format: str = Form(...),
    parameters_measured: Optional[str] = Form(None),
    collection_start_date: Optional[str] = Form(None),
    collection_end_date: Optional[str] = Form(None),
    spatial_coverage: Optional[str] = Form(None),
    license_type: str = Form("open"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    allowed_mimes = ALLOWED_FORMATS.get(file_format, [])
    if not validate_file_type(content, allowed_mimes):
        if file.content_type not in allowed_mimes:
            raise HTTPException(status_code=400, detail=f"Invalid file type for {file_format}. Allowed: {', '.join(allowed_mimes)}")
    
    dataset_dir = os.path.join(UPLOAD_DIR, "datasets", str(expedition_id) if expedition_id else "standalone")
    os.makedirs(dataset_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(dataset_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)
    
    params_list = [p.strip() for p in parameters_measured.split(",")] if parameters_measured else None
    
    try:
        dataset = ScientificDataset(
            expedition_id=expedition_id,
            title=title,
            description=description,
            data_type=data_type,
            file_path=file_path,
            file_format=file_format,
            parameters_measured=params_list,
            collection_start_date=collection_start_date,
            collection_end_date=collection_end_date,
            spatial_coverage=spatial_coverage,
            license_type=license_type
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create dataset DB entry: {str(e)}")
    
    return dataset

@router.get("", response_model=list[ScientificDatasetResponse])
def get_datasets(db: Session = Depends(get_db)):
    return db.query(ScientificDataset).all()

@router.get("/{dataset_id}", response_model=ScientificDatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def get_dataset_preview(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return generate_dataset_preview_safe(dataset.file_path, dataset.file_format)

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
            
    db.delete(dataset)
    db.commit()
    return {"message": "Deleted successfully"}
