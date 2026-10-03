from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session
import os
from datetime import datetime
from email.utils import formatdate
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

def get_file_with_range(file_path: str, content_type: str, filename: str, request: Request):
    """
    Serve a file with HTTP Range request support for resable downloads.
    Returns either a 200 response (full file) or 206 Partial Content (range request).
    """
    file_size = os.path.getsize(file_path)
    file_mtime = os.path.getmtime(file_path)
    last_modified = formatdate(file_mtime, usegmt=True)

    # Parse Range header
    range_header = request.headers.get("range")
    if range_header:
        # Parse Range header format: "bytes=start-end"
        try:
            range_match = range_header.replace("bytes=", "").split("-")
            start = int(range_match[0])
            end = int(range_match[1]) if range_match[1] else file_size - 1

            # Validate range
            if start >= file_size or end >= file_size or start > end:
                return Response(
                    status_code=416,
                    headers={
                        "Content-Range": f"bytes */{file_size}",
                        "Accept-Ranges": "bytes"
                    }
                )

            # Calculate content length for this range
            content_length = end - start + 1

            # Open file and seek to start position
            def iterfile():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk_size = min(8192, remaining)  # 8KB chunks
                        data = f.read(chunk_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data

            return Response(
                content=iterfile(),
                status_code=206,
                media_type=content_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Content-Length": str(content_length),
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "ETag": f'"{int(file_mtime)}-{file_size}"',
                    "Last-Modified": last_modified
                }
            )
        except (ValueError, IndexError):
            # Invalid range header, serve full file
            pass

    # No Range header or invalid range - serve full file
    return FileResponse(
        path=file_path,
        media_type=content_type,
        filename=filename,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "ETag": f'"{int(file_mtime)}-{file_size}"',
            "Last-Modified": last_modified
        }
    )

@router.get("/reports/{report_id}")
def get_report_file(report_id: int, download: bool = False, request: Request = None, db: Session = Depends(get_db)):
    report = db.query(ExpeditionReport).filter(ExpeditionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.file_path.startswith("http"):
        url = report.file_path
        if download and "res.cloudinary.com" in url:
            url = url.replace("/upload/", "/upload/fl_attachment/")
        return RedirectResponse(url)

    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return get_file_with_range(
        file_path=report.file_path,
        content_type=get_content_type(report.file_path, "report"),
        filename=os.path.basename(report.file_path),
        request=request
    )

@router.get("/datasets/{dataset_id}")
def get_dataset_file(dataset_id: int, download: bool = False, request: Request = None, db: Session = Depends(get_db)):
    dataset = db.query(ScientificDataset).filter(ScientificDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.file_path and dataset.file_path.startswith("http"):
        url = dataset.file_path
        if download and "res.cloudinary.com" in url:
            url = url.replace("/upload/", "/upload/fl_attachment/")
        return RedirectResponse(url)

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return get_file_with_range(
        file_path=dataset.file_path,
        content_type=get_content_type(dataset.file_path, "dataset"),
        filename=os.path.basename(dataset.file_path),
        request=request
    )

@router.get("/publications/{publication_id}")
def get_publication_file(publication_id: int, download: bool = False, request: Request = None, db: Session = Depends(get_db)):
    publication = db.query(Publication).filter(Publication.id == publication_id).first()
    if not publication or not publication.file_path:
        raise HTTPException(status_code=404, detail="Publication file not found")

    if publication.file_path.startswith("http"):
        url = publication.file_path
        if download and "res.cloudinary.com" in url:
            url = url.replace("/upload/", "/upload/fl_attachment/")
        return RedirectResponse(url)

    if not os.path.exists(publication.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return get_file_with_range(
        file_path=publication.file_path,
        content_type=get_content_type(publication.file_path, "publication"),
        filename=os.path.basename(publication.file_path),
        request=request
    )

@router.get("/media/{media_id}")
def get_media_file(media_id: int, download: bool = False, request: Request = None, db: Session = Depends(get_db)):
    media = db.query(MediaItem).filter(MediaItem.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    if media.file_path and media.file_path.startswith("http"):
        url = media.file_path
        if download and "res.cloudinary.com" in url:
            url = url.replace("/upload/", "/upload/fl_attachment/")
        return RedirectResponse(url)

    if not os.path.exists(media.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return get_file_with_range(
        file_path=media.file_path,
        content_type=get_content_type(media.file_path, media.media_type),
        filename=os.path.basename(media.file_path),
        request=request
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
