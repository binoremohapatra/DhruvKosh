from app.utils.storage import upload_to_cloud_if_configured
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil
from app.database import get_db
from app.models import ExpeditionReport
from app.schemas import ExpeditionReportCreate, ExpeditionReportResponse
from app.utils import extract_pdf_text_safe, validate_file_type

router = APIRouter()
UPLOAD_DIR = "uploads"
ALLOWED_MIMES = ["application/pdf"]

@router.post("/{expedition_id}/reports", response_model=ExpeditionReportResponse)
async def upload_report(
    expedition_id: int,
    title: str = Form(...),
    report_type: str = Form(...),
    submission_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    submitted_by: Optional[int] = Form(1),
    db: Session = Depends(get_db)
):
    content = await file.read()
    if not validate_file_type(content, ALLOWED_MIMES):
        if file.content_type not in ALLOWED_MIMES:
            raise HTTPException(status_code=400, detail="Only actual PDF files are allowed")
    
    report_dir = os.path.join(UPLOAD_DIR, "reports", str(expedition_id))
    os.makedirs(report_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(report_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)
    
    extracted_text, page_count = extract_pdf_text_safe(file_path)
    
    try:
        report = ExpeditionReport(
            expedition_id=expedition_id,
            title=title,
            file_path=file_path,
            report_type=report_type,
            submitted_by=submitted_by,
            submission_date=submission_date,
            extracted_text=extracted_text,
            page_count=page_count
        )
        db.add(report)
        db.commit()
        db.refresh(report)
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to create report DB entry: {str(e)}")
    
    return report

@router.get("/{report_id}", response_model=ExpeditionReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception:
            pass
            
    db.delete(report)
    db.commit()
    return {"message": "Deleted successfully"}
