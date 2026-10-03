import os
from dotenv import load_dotenv
load_dotenv()

import cloudinary
import cloudinary.uploader
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
if CLOUDINARY_URL:
    cloudinary.config(
        secure=True
    )

def upload_to_cloud_if_configured(local_path: str, folder: str, unique_filename: str) -> str:
    """
    Uploads a local file to Cloudinary if configured.
    Returns the Cloudinary URL on success, or the local_path if Cloudinary is not configured/fails.
    """
    if not CLOUDINARY_URL:
        return local_path
        
    try:
        file_extension = os.path.splitext(unique_filename)[1].lower()
        resource_type = "auto"
        if file_extension in [".csv", ".nc", ".xlsx"]:
            resource_type = "raw"
            
        print(f"Uploading {local_path} to Cloudinary...")
        upload_result = cloudinary.uploader.upload(
            local_path, 
            folder=f"dhruvkosh/{folder}",
            public_id=os.path.splitext(unique_filename)[0],
            resource_type=resource_type
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return local_path
