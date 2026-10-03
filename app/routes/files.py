from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
import os
from app.database import get_db
from app.models import ExpeditionReport, ScientificDataset, Publication, MediaItem

router = APIRouter()

def get_content_type(file_path: str, content_type: str) -> str:
    """Determine appropriate Content-Type header"""
    if content_type == "report" or content_type == "publication":
        return "application/pdf"
    elif content_type == "photo":
        return "image/jpeg"
    elif content_type == "video":
        return "video/mp4"
    elif content_type == "dataset":
        if file_path.endswith(".csv"):
            return "text/csv"
        elif file_path.endswith(".xlsx"):
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif file_path.endswith(".nc"):
            return "application/x-netcdf"
        else:
            return "application/octet-stream"
    return "application/octet-stream"

@router.get("/reports/{report_id}")
def get_report_file(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.file_path.startswith("http"):
        return RedirectResponse(report.file_path)
        
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=report.file_path,
        media_type=get_content_type(report.file_path, "report"),
        filename=os.path.basename(report.file_path)
    )

@router.get("/datasets/{dataset_id}")
def get_dataset_file(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.file_path and dataset.file_path.startswith("http"):
        return RedirectResponse(dataset.file_path)
        
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=dataset.file_path,
        media_type=get_content_type(dataset.file_path, "dataset"),
        filename=os.path.basename(dataset.file_path)
    )

@router.get("/publications/{publication_id}")
def get_publication_file(publication_id: int, db: Session = Depends(get_db)):
    publication = db.query(Publication).filter(Publication.id == publication_id).first()
    if not publication or not publication.file_path:
        raise HTTPException(status_code=404, detail="Publication file not found")
    
    if publication.file_path.startswith("http"):
        return RedirectResponse(publication.file_path)
        
    if not os.path.exists(publication.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=publication.file_path,
        media_type=get_content_type(publication.file_path, "publication"),
        filename=os.path.basename(publication.file_path)
    )

@router.get("/media/{media_id}")
def get_media_file(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    
    if media.file_path and media.file_path.startswith("http"):
        return RedirectResponse(media.file_path)
        
    if not os.path.exists(media.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=media.file_path,
        media_type=get_content_type(media.file_path, media.media_type),
        filename=os.path.basename(media.file_path)
    )

@router.get("/media/{media_id}/thumbnail")
def get_media_thumbnail(media_id: int, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media or not media.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    if media.thumbnail_path.startswith("http"):
        return RedirectResponse(media.thumbnail_path)
        
    if not os.path.exists(media.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found on disk")
    
    return FileResponse(
        path=media.thumbnail_path,
        media_type="image/jpeg",
        filename=os.path.basename(media.thumbnail_path)
    )
