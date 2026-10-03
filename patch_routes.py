import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "upload_to_cloud_if_configured" in content:
        return
        
    content = "from app.utils.storage import upload_to_cloud_if_configured\n" + content
    
    # We replace:
    # try: 
    #     with open(file_path, "wb") as buffer: 
    #         buffer.write(content) 
    # except Exception as e: 
    #     raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    target = '    try: \n        with open(file_path, "wb") as buffer: \n            buffer.write(content) \n    except Exception as e: \n        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")'
    
    replacement = '''    try: 
        with open(file_path, "wb") as buffer: 
            buffer.write(content) 
    except Exception as e: 
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)'''

    # For datasets.py which has a slightly different exception:
    target2 = '    try:\n        with open(file_path, "wb") as buffer:\n            buffer.write(content)\n    except Exception as e:\n        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")'
    
    replacement2 = '''    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)'''
    
    # Replace all whitespace variations
    import re
    pattern = re.compile(r'try:\s*with open\(file_path, "wb"\) as buffer:\s*buffer\.write\(content\)\s*except Exception as e:\s*raise HTTPException\(status_code=500, detail=f"Failed to save file: \{str\(e\)\}"\)')
    
    def replacer(match):
        return match.group(0) + '\n    file_path = upload_to_cloud_if_configured(file_path, "uploads", unique_filename)'
        
    content = pattern.sub(replacer, content)
    
    # also for media.py it might be `thumbnail_path`
    pattern_thumb = re.compile(r'try:\s*with open\(thumbnail_path, "wb"\) as buffer:\s*buffer\.write\(thumb_data\)\s*except Exception as e:\s*raise HTTPException\(status_code=500, detail=f"Failed to save thumbnail: \{str\(e\)\}"\)')
    def replacer_thumb(match):
        return match.group(0) + '\n    thumbnail_path = upload_to_cloud_if_configured(thumbnail_path, "thumbnails", f"thumb_{unique_filename}")'
    
    content = pattern_thumb.sub(replacer_thumb, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r"d:\planb\app\routes"
for fname in ["reports.py", "datasets.py", "publications.py", "media.py"]:
    replace_in_file(os.path.join(base_dir, fname))
