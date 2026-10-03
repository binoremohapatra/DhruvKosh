import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import expeditions, reports, datasets, publications, media, activities, files, auth, generated_content
import uvicorn
from dotenv import load_dotenv
import os

load_dotenv()

from fastapi.responses import JSONResponse
import traceback
from app.services.publish_service import start_scheduler
from app.services.publishers.registry import get_available_platforms

app = FastAPI(title="NCPOR Polar Science Outreach Portal")

from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ScientificDataset, Publication, ExpeditionReport, MediaItem, PublishLog, GeneratedContent

@app.delete("/api/wipe-stale")
def wipe_stale_data(db: Session = Depends(get_db)):
    # Clear logs and generated content to avoid foreign key constraints during wipe
    db.query(PublishLog).delete()
    db.query(GeneratedContent).delete()
    
    deleted = 0
    for model in [ExpeditionReport, ScientificDataset, Publication, MediaItem]:
        items = db.query(model).all()
        for item in items:
            if item.file_path and not str(item.file_path).startswith("http"):
                db.delete(item)
                deleted += 1
    db.commit()
    return {"message": f"Deleted {deleted} stale records and cleared logs"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc), "trace": traceback.format_exc()}
    )

# CORS enabled for all origins (hackathon demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://dhruv-kosh.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(expeditions.router, prefix="/api/expeditions", tags=["expeditions"])
app.include_router(reports.router, prefix="/api/expeditions", tags=["reports"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(publications.router, prefix="/api/publications", tags=["publications"])
app.include_router(media.router, prefix="/api/expeditions", tags=["media"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(generated_content.router, prefix="/api/generated", tags=["generated_content"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
from app.routes import publish
from fastapi.staticfiles import StaticFiles

app.include_router(publish.router, prefix="/api/publish", tags=["publish"])

# Mount uploads directory so images can be accessed publicly by external APIs (like Instagram)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_event():
    init_db()
    start_scheduler()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy", 
        "service": "NCPOR Portal API",
        "configured_platforms": get_available_platforms(),
        "publish_mode": os.getenv("PUBLISH_MODE", "dry_run")
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
