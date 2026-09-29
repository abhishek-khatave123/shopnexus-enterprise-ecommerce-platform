"""
Cloudinary upload service.

If Cloudinary credentials are not configured, upload_image() returns a
clear "not configured" result instead of raising, so the rest of the
application keeps working in local development.
"""
import logging

from app.core.config import settings

logger = logging.getLogger("shopnexus.cloudinary")

_configured_client = False


def _ensure_configured():
    global _configured_client
    if _configured_client or not settings.cloudinary_configured:
        return
    import cloudinary

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    _configured_client = True


def upload_image(file_bytes: bytes, folder: str = "shopnexus/products") -> dict:
    """
    Returns:
        {"success": True, "url": ..., "public_id": ...} on success
        {"success": False, "message": "..."} if not configured or upload failed
    """
    if not settings.cloudinary_configured:
        logger.warning("Cloudinary upload attempted but credentials are not configured")
        return {
            "success": False,
            "message": (
                "Image upload is not available: Cloudinary credentials are not configured. "
                "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend .env file."
            ),
        }

    try:
        _ensure_configured()
        import cloudinary.uploader

        result = cloudinary.uploader.upload(file_bytes, folder=folder)
        return {"success": True, "url": result.get("secure_url"), "public_id": result.get("public_id")}
    except Exception as exc:
        logger.exception("Cloudinary upload failed")
        return {"success": False, "message": f"Image upload failed: {exc}"}


def delete_image(public_id: str) -> bool:
    if not settings.cloudinary_configured or not public_id:
        return False
    try:
        _ensure_configured()
        import cloudinary.uploader

        cloudinary.uploader.destroy(public_id)
        return True
    except Exception:
        logger.exception("Cloudinary delete failed for public_id=%s", public_id)
        return False
