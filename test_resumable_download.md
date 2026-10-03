# Resumable Download Testing Guide

## Implementation Summary

### Backend Files Changed
1. **app/routes/files.py**
   - Added `get_file_with_range()` function to handle HTTP Range requests
   - Updated all file endpoints (reports, datasets, publications, media) to use Range request support
   - Returns HTTP 206 Partial Content for Range requests
   - Returns HTTP 200 for normal requests
   - Includes `Accept-Ranges: bytes`, `Content-Range`, `ETag`, and `Last-Modified` headers
   - Streams files in 8KB chunks to avoid loading large files into memory

### Frontend Files Changed
1. **frontend/src/App.jsx**
   - Added `DownloadProvider` context wrapper around the app
   - Enables global download management across the application

2. **frontend/src/pages/ContentDetail.jsx**
   - Replaced all standard `<a download>` links with `ResumableDownloadButton` component
   - Applies to: reports, publications, photos, videos, datasets, and generic files
   - Each download gets a unique ID based on content type and ID

### Existing Frontend Components (No Changes Needed)
- **frontend/src/context/DownloadContext.jsx** - Already implements full resumable download logic
- **frontend/src/components/ResumableDownloadButton.jsx** - Already implements UI with progress tracking
- **frontend/src/utils/indexedDBStorage.js** - Already implements IndexedDB storage for partial downloads

## How Range Requests Work

1. **Normal Request (No Range)**
   ```
   GET /api/files/reports/1
   Response: 200 OK
   Headers:
     Accept-Ranges: bytes
     Content-Length: 524288000
     ETag: "1234567890-524288000"
     Last-Modified: Wed, 03 Oct 2026 12:00:00 GMT
   ```

2. **Range Request (Resume)**
   ```
   GET /api/files/reports/1
   Headers:
     Range: bytes=104857600-
   Response: 206 Partial Content
   Headers:
     Content-Range: bytes 104857600-524288799/524288000
     Content-Length: 419403200
     Accept-Ranges: bytes
     ETag: "1234567890-524288000"
     Last-Modified: Wed, 03 Oct 2026 12:00:00 GMT
   ```

## Where Partial Downloads Are Stored

- **IndexedDB** database named `dhruvkosh_downloads`
- Two object stores:
  - `meta` - Stores download metadata (URL, filename, totalBytes, downloadedBytes, ETag, Last-Modified, status)
  - `chunks` - Stores binary data chunks keyed by [downloadId, offset]
- Chunks are stored as ArrayBuffers and reassembled into a Blob on completion
- Survives browser restarts and page refreshes

## How Resume Position Is Calculated

1. When download starts/resumes, the frontend checks IndexedDB for existing metadata
2. It retrieves the `downloadedBytes` value from the meta store
3. It sends a Range request: `Range: bytes={downloadedBytes}-`
4. The server responds with bytes starting from that position
5. New chunks are appended to IndexedDB at the correct offset
6. Progress is tracked by summing all stored chunk sizes

## How File Integrity Is Verified

1. **ETag Validation**
   - On resume, frontend sends HEAD request to get current ETag
   - Compares with stored ETag from initial download
   - If different, discards partial data and restarts download

2. **Last-Modified Validation**
   - If ETag not available, uses Last-Modified header
   - Compares modification time with stored value
   - If file changed, restarts download

3. **Byte Count Validation**
   - Tracks total bytes downloaded vs. expected total
   - Only marks complete when all bytes received

## How to Test in Chrome DevTools

### Test 1: Basic Range Request Support

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Navigate to a file download page (e.g., ContentDetail for a report)
4. Click the download button
5. Observe the request in Network tab
6. Check response headers:
   - Should include `Accept-Ranges: bytes`
   - Status should be 200 OK (first request)

### Test 2: Simulate Connection Drop

1. Start a download of a large file (>10MB)
2. Allow it to download for a few seconds
3. In DevTools Network tab, check the "Throttling" dropdown
4. Select "Offline" to simulate connection loss
5. The download should pause and show "Connection lost" error
6. Check that the UI shows: "Connection lost – download paused at X MB"
7. Re-select "No throttling" to restore connection
8. Click "Resume" button
9. In Network tab, observe the new request should have:
   - Header: `Range: bytes={already_downloaded}-`
   - Status: 206 Partial Content
   - Header: `Content-Range: bytes {start}-{end}/{total}`
10. Verify the download continues from where it left off

### Test 3: Verify No Redownload

1. Start download of a test file
2. Pause at ~10MB
3. Inspect IndexedDB:
   - Open DevTools → Application tab → IndexedDB → dhruvkosh_downloads
   - Check `meta` store for the download ID
   - Check `chunks` store for stored data
4. Note the `downloadedBytes` value
5. Resume download
6. Verify the Range request starts from that exact byte position
7. Verify the total downloaded equals expected size

### Test 4: File Change Detection

1. Start download of a file
2. Pause at some point
3. Modify the file on the server (change content or update timestamp)
4. Resume download
5. Verify the system detects the change (ETag/Last-Modified mismatch)
6. Verify partial data is discarded
7. Verify download restarts from 0

### Test 5: Multiple Concurrent Downloads

1. Start download of File A
2. Start download of File B
3. Pause File A while File B continues
4. Resume File A
5. Verify both downloads maintain independent progress
6. Verify both can be paused/resumed independently

### Test 6: Browser Persistence

1. Start a download and pause it
2. Refresh the page
3. Verify the download state is restored (shows "paused" with progress)
4. Click resume
5. Verify it continues from the correct position

### Test 7: Bandwidth Mode Integration

1. Enable low bandwidth mode in the app
2. Try downloading a large file
3. Verify the UI shows file size warning for files >100MB
4. Verify download still works with resumable support
5. Verify you can pause/resume even in low bandwidth mode

## Test File Creation

To create a test file for testing:

```bash
# Create a 100MB test file
dd if=/dev/zero of=test_file_100mb.dat bs=1M count=100

# On Windows (PowerShell)
$file = [System.IO.File]::Create("test_file_100mb.dat")
$file.SetLength(100MB)
$file.Close()
```

Then upload this file as a dataset and test the download functionality.

## Expected Behavior Summary

✅ **Download starts** - Shows progress bar, downloads in 2MB chunks
✅ **Connection drops** - Pauses, shows error message, preserves partial data
✅ **Connection returns** - Auto-resumes or shows Resume button
✅ **Resume works** - Sends Range request from last byte, gets 206 response
✅ **No redownload** - First 100MB is NOT downloaded again
✅ **File integrity** - ETag/Last-Modified validation prevents corruption
✅ **Multiple downloads** - Each tracked independently
✅ **Browser restart** - State preserved in IndexedDB
✅ **Completion** - Triggers browser Save-As dialog with complete file
