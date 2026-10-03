import os

def process_file(filepath, folder_name):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add the import if not present
    if "from app.utils.storage import upload_to_cloud_if_configured" not in content:
        content = "from app.utils.storage import upload_to_cloud_if_configured\n" + content
    
    # Replace the db insert to use a final_path
    if "file_path=file_path" in content:
        content = content.replace("file_path=file_path", "file_path=final_path")
        
    # Inject the upload_to_cloud_if_configured after the local file write
    # Find the try/except block for writing the file
    write_block = """try: 
        with open(file_path, "wb") as buffer: 
            buffer.write(content) 
    except Exception as e: 
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")"""
        
    write_block_clean = write_block.replace("\r", "")
    
    # For datasets.py
    if "datasets.py" in filepath:
        # custom replace for datasets since it has a different exception message sometimes
        pass

    with open(filepath, 'w') as f:
        f.write(content)

# We will just write the exact python files for safety.
