"""
range_response.py
-----------------
Utility that adds HTTP Range Request support (RFC 7233) to FastAPI file
endpoints.

Behaviour
---------
• Normal GET (no Range header)  → 200 OK, full file, Accept-Ranges: bytes
• Valid Range header             → 206 Partial Content, slice of file
• Satisfiable range only        → 416 Range Not Satisfiable on bad range

The file is read in 64 KB chunks so multi-hundred-MB files never land in RAM.
Auth / access control is enforced by the calling endpoint BEFORE this utility
is invoked – this function only deals with byte-range serving.
"""

import os
import re
from typing import Optional, Iterator

from fastapi import Request
from fastapi.responses import StreamingResponse, Response


_CHUNK = 65536  # 64 KB streaming chunk


def _stream_file(path: str, start: int, end: int) -> Iterator[bytes]:
    """Yield file bytes from `start` to `end` (inclusive) in 64 KB chunks."""
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk_size = min(_CHUNK, remaining)
            data = f.read(chunk_size)
            if not data:
                break
            yield data
            remaining -= len(data)


def _parse_range(range_header: str, file_size: int) -> Optional[tuple[int, int]]:
    """
    Parse a 'bytes=<start>-<end>' Range header.

    Returns (start, end) integers where end is inclusive, or None if the
    header is malformed or unsatisfiable.
    """
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if not m:
        return None

    raw_start, raw_end = m.group(1), m.group(2)

    if not raw_start and not raw_end:
        return None

    if not raw_start:
        # suffix-range:  bytes=-500  →  last 500 bytes
        suffix = int(raw_end)
        start = max(0, file_size - suffix)
        end = file_size - 1
    elif not raw_end:
        # open-ended range:  bytes=1024-
        start = int(raw_start)
        end = file_size - 1
    else:
        start = int(raw_start)
        end = int(raw_end)

    if start > end or start >= file_size:
        return None  # unsatisfiable

    end = min(end, file_size - 1)
    return start, end


def create_ranged_file_response(
    request: Request,
    file_path: str,
    media_type: str,
    filename: str,
) -> Response:
    """
    Build the appropriate Response for *local* file downloads.

    • Always includes  Accept-Ranges: bytes
    • Includes  ETag  and  Last-Modified  for integrity checking on resume
    • Returns 206 when a valid Range header is present
    • Returns 200 for a plain (no Range) request
    • Returns 416 for an unsatisfiable range
    """
    file_size = os.path.getsize(file_path)
    stat = os.stat(file_path)
    etag = f'"{int(stat.st_mtime)}-{file_size}"'
    last_modified = stat.st_mtime

    from email.utils import formatdate
    last_modified_str = formatdate(last_modified, usegmt=True)

    base_headers = {
        "Accept-Ranges": "bytes",
        "ETag": etag,
        "Last-Modified": last_modified_str,
        "Content-Disposition": f'attachment; filename="{filename}"',
    }

    range_header: Optional[str] = request.headers.get("Range")

    if not range_header:
        # Full file – 200 OK
        base_headers["Content-Length"] = str(file_size)
        return StreamingResponse(
            _stream_file(file_path, 0, file_size - 1),
            status_code=200,
            media_type=media_type,
            headers=base_headers,
        )

    parsed = _parse_range(range_header, file_size)
    if parsed is None:
        return Response(
            status_code=416,
            headers={
                **base_headers,
                "Content-Range": f"bytes */{file_size}",
            },
        )

    start, end = parsed
    content_length = end - start + 1

    partial_headers = {
        **base_headers,
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(content_length),
    }

    return StreamingResponse(
        _stream_file(file_path, start, end),
        status_code=206,
        media_type=media_type,
        headers=partial_headers,
    )
