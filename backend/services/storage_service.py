import io
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Tuple

import aiofiles

from config import settings

logger = logging.getLogger(__name__)


def _generate_unique_filename(original_filename: str) -> str:
    ext = Path(original_filename).suffix
    return f"{uuid.uuid4().hex}{ext}"


def _get_date_subfolder() -> str:
    now = datetime.utcnow()
    return now.strftime("%Y/%m/%d")


async def save_file(file: BinaryIO, filename: str, subfolder: str = "") -> str:
    """Save an uploaded file to local storage or S3.

    Returns the file path (relative for local, key for S3).
    """
    unique_filename = _generate_unique_filename(filename)

    if settings.STORAGE_TYPE == "s3":
        return await _save_to_s3(file, unique_filename, subfolder)
    else:
        return await _save_to_local(file, unique_filename, subfolder)


async def _save_to_local(file: BinaryIO, filename: str, subfolder: str = "") -> str:
    date_folder = _get_date_subfolder()
    relative_dir = os.path.join(subfolder, date_folder) if subfolder else date_folder
    full_dir = os.path.join(settings.STORAGE_LOCAL_PATH, relative_dir)
    Path(full_dir).mkdir(parents=True, exist_ok=True)

    file_path = os.path.join(full_dir, filename)
    relative_path = os.path.join(relative_dir, filename)

    content = file.read() if hasattr(file, "read") else file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return relative_path


async def _save_to_s3(file: BinaryIO, filename: str, subfolder: str = "") -> str:
    import boto3

    date_folder = _get_date_subfolder()
    key = os.path.join(subfolder, date_folder, filename) if subfolder else os.path.join(date_folder, filename)

    content = file.read() if hasattr(file, "read") else file

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION or "us-east-1",
    )
    s3_client.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=key,
        Body=content,
    )
    return key


async def get_file(file_path: str) -> bytes:
    """Retrieve a file's contents from storage."""
    if settings.STORAGE_TYPE == "s3":
        return await _get_from_s3(file_path)
    else:
        return await _get_from_local(file_path)


async def _get_from_local(file_path: str) -> bytes:
    full_path = os.path.join(settings.STORAGE_LOCAL_PATH, file_path)
    async with aiofiles.open(full_path, "rb") as f:
        return await f.read()


async def _get_from_s3(key: str) -> bytes:
    import boto3

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION or "us-east-1",
    )
    response = s3_client.get_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    return response["Body"].read()


async def delete_file(file_path: str) -> None:
    """Delete a file from storage."""
    if settings.STORAGE_TYPE == "s3":
        await _delete_from_s3(file_path)
    else:
        await _delete_from_local(file_path)


async def _delete_from_local(file_path: str) -> None:
    full_path = os.path.join(settings.STORAGE_LOCAL_PATH, file_path)
    if os.path.exists(full_path):
        os.remove(full_path)


async def _delete_from_s3(key: str) -> None:
    import boto3

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION or "us-east-1",
    )
    s3_client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)


async def get_file_url(file_path: str) -> str:
    """Return a URL for accessing the file."""
    if settings.STORAGE_TYPE == "s3":
        import boto3

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION or "us-east-1",
        )
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": file_path},
            ExpiresIn=3600,
        )
        return url
    else:
        return f"{settings.APP_URL}/uploads/{file_path}"


# ---------------------------------------------------------------------------
# Photo-specific helpers — thumbnail & medium generation with Pillow
# ---------------------------------------------------------------------------

def _build_variant_paths(file_path: str, suffix: str) -> Tuple[str, str]:
    """Given an original file path like 'photos/2024/01/12/abc.jpg', build
    the variant path like 'photos/2024/01/12/abc_thumb.jpg'.

    Returns (absolute_variant_path, relative_variant_path).
    """
    parts = Path(file_path).parts
    stem = Path(file_path).stem
    ext = Path(file_path).suffix
    variant_name = f"{stem}{suffix}{ext}"
    variant_rel = str(Path(*parts[:-1]) / variant_name) if len(parts) > 1 else variant_name
    variant_abs = os.path.join(settings.STORAGE_LOCAL_PATH, variant_rel)
    return variant_abs, variant_rel


async def save_photo(
    file: BinaryIO,
    filename: str,
    category: str = "general",
) -> Tuple[str, str | None, str | None, int, int]:
    """Save an original photo and generate thumbnail + medium variants.

    Uses Pillow to downscale images.  For local storage the variants are
    written directly; for S3 they are uploaded separately.

    Returns (original_rel_path, thumb_rel_path | None, medium_rel_path | None,
             width, height).
    """
    from PIL import Image

    unique_name = _generate_unique_filename(filename)
    date_folder = _get_date_subfolder()

    # Read original bytes
    raw = file.read() if hasattr(file, "read") else file

    # Open with Pillow to get dimensions & generate variants
    img = Image.open(io.BytesIO(raw))
    width, height = img.size
    ext = Path(filename).suffix.lower()
    fmt = "JPEG"
    if ext in (".png",):
        fmt = "PNG"
    elif ext in (".webp",):
        fmt = "WEBP"

    # ------------------------------------------------------------------
    # 1. Save original
    # ------------------------------------------------------------------
    rel_dir = os.path.join(settings.PHOTO_STORAGE_PREFIX, category, date_folder)
    abs_dir = os.path.join(settings.STORAGE_LOCAL_PATH, rel_dir)
    Path(abs_dir).mkdir(parents=True, exist_ok=True)

    orig_abs = os.path.join(abs_dir, unique_name)
    orig_rel = os.path.join(rel_dir, unique_name)

    if settings.STORAGE_TYPE == "s3":
        await _save_bytes_to_s3(raw, orig_rel)
    else:
        async with aiofiles.open(orig_abs, "wb") as f:
            await f.write(raw)

    # ------------------------------------------------------------------
    # 2. Generate thumbnail
    # ------------------------------------------------------------------
    thumb_abs, thumb_rel = _build_variant_paths(orig_rel, "_thumb")
    thumb_size = settings.PHOTO_THUMBNAIL_SIZE
    thumb_img = img.copy()
    thumb_img.thumbnail((thumb_size, thumb_size), Image.LANCZOS)
    _save_image_sync(thumb_abs, thumb_img, fmt)

    # ------------------------------------------------------------------
    # 3. Generate medium
    # ------------------------------------------------------------------
    medium_abs, medium_rel = _build_variant_paths(orig_rel, "_med")
    med_size = settings.PHOTO_MEDIUM_SIZE
    med_img = img.copy()
    med_img.thumbnail((med_size, med_size), Image.LANCZOS)
    _save_image_sync(medium_abs, med_img, fmt)

    # For S3, upload the generated variants
    if settings.STORAGE_TYPE == "s3":
        for abs_path, rel_path in ((thumb_abs, thumb_rel), (medium_abs, medium_rel)):
            with open(abs_path, "rb") as fh:
                await _save_bytes_to_s3(fh.read(), rel_path)
            os.remove(abs_path)  # clean local temp

    return orig_rel, thumb_rel, medium_rel, width, height


def _save_image_sync(abs_path: str, img, fmt: str) -> None:
    """Write a Pillow image to disk synchronously (fast, runs in thread)."""
    Path(os.path.dirname(abs_path)).mkdir(parents=True, exist_ok=True)
    save_kwargs = {"quality": 85, "optimize": True} if fmt == "JPEG" else {}
    img.save(abs_path, format=fmt, **save_kwargs)


async def delete_photo_files(
    file_path: str,
    thumbnail_path: str | None = None,
    medium_path: str | None = None,
) -> None:
    """Delete original + variant files from storage."""
    await delete_file(file_path)
    if thumbnail_path:
        await delete_file(thumbnail_path)
    if medium_path:
        await delete_file(medium_path)


async def get_photo_url(photo_path: str) -> str:
    """Public URL for a photo (or variant) path."""
    return await get_file_url(photo_path)
