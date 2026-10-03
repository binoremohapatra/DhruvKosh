import re

def patch_file(filepath, var_name="file_path"):
    with open(filepath, 'r') as f:
        content = f.read()
        
    if "upload_to_cloud_if_configured" in content:
        return # already patched

    # Add import
    content = "from app.utils.storage import upload_to_cloud_if_configured\n" + content
    
    # Replace file_path saving with local_path and Cloudinary upload
    pattern = r'(.*?_dir\s*=\s*os\.path\.join.*?)\n\s+file_extension.*?unique_filename\s*=\s*f"\{uuid\.uuid4\(\)\}\{file_extension\}".*?' + var_name + r'\s*=\s*os\.path\.join\([^,]+,\s*unique_filename\)\s*try:\s*with open\(' + var_name + r', "wb"\) as buffer:\s*buffer\.write\(content\)\s*except Exception as e:\s*raise HTTPException\(status_code=500, detail=f"Failed to save file: \{str\(e\)\}"\)'
    
    replacement = r'''\1
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    local_file_path = os.path.join(\1.split('os.path.join(')[1].split(',')[0].strip(), unique_filename)
    
    try:
        with open(local_file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file locally: {str(e)}")
        
    ''' + var_name + ''' = upload_to_cloud_if_configured(local_file_path, "uploads", unique_filename)'''
    
    # We will just write a simpler string replacement
    
    with open(filepath, 'w') as f:
        f.write(content)
