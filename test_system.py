import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

print("--- SYSTEM TEST STARTED ---")

# 1. Test Dataset Upload
print("\\n1. Uploading test dataset...")
with open("test_system.csv", "w") as f:
    f.write("test,data\\n1,2\\n3,4")

files = {'file': ('test_system.csv', open('test_system.csv', 'rb'), 'text/csv')}
data = {
    'title': 'Automated Test Dataset',
    'data_type': 'test',
    'file_format': 'CSV'
}

response = requests.post(f"{BASE_URL}/datasets", files=files, data=data)
if response.status_code == 200:
    dataset = response.json()
    print("SUCCESS: Dataset uploaded.")
    print(f"Dataset ID: {dataset['id']}")
    print(f"File Path stored in DB: {dataset['file_path']}")
    
    if "res.cloudinary.com" in dataset['file_path']:
        print("CLOUDINARY CHECK: SUCCESS! File was uploaded to Cloudinary.")
    else:
        print("CLOUDINARY CHECK: FAILED! File was saved locally:", dataset['file_path'])
        
    dataset_id = dataset['id']
else:
    print(f"FAILED to upload: {response.text}")
    exit(1)

# 2. Test Fetching the File (Redirect Check)
print("\\n2. Testing file retrieval (expecting redirect URL or file)...")
# Note: since the API might not follow redirects automatically using files/datasets route if we disable redirect
# We just check the response status
file_res = requests.get(f"{BASE_URL}/files/datasets/{dataset_id}", allow_redirects=False)
print(f"Fetch Response Code: {file_res.status_code}")
if file_res.status_code in [301, 302, 307]:
    print("SUCCESS: Endpoint returned a redirect to:", file_res.headers.get('Location'))
else:
    print("WARNING: Endpoint did not return a redirect. (If using local disk, this is normal 200)")

# 3. Test Delete (The new button logic)
print("\\n3. Testing Delete Endpoint...")
del_res = requests.delete(f"{BASE_URL}/datasets/{dataset_id}")
if del_res.status_code == 200:
    print("SUCCESS: Dataset deleted successfully.")
else:
    print(f"FAILED to delete: {del_res.text}")

print("\\n--- SYSTEM TEST COMPLETED ---")
