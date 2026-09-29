from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.models.product import Product
from app.models.product_image import ProductImage
from app.schemas.product import ProductImageOut
from app.services import cloudinary_service

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
}


def _matches_image_signature(file_bytes: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return file_bytes.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return file_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(file_bytes) >= 12 and file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP"
    return False


async def _read_validated_image(file: UploadFile) -> bytes:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Use JPEG, PNG, or WebP.",
        )

    file_bytes = await file.read(MAX_IMAGE_SIZE + 1)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty")
    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds the 5 MB limit")
    if not _matches_image_signature(file_bytes, content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Invalid {ALLOWED_IMAGE_TYPES[content_type]} image content",
        )
    return file_bytes


@router.post(
    "/product-image",
    response_model=ProductImageOut,
    summary="Upload a product image to Cloudinary (Admin only)",
)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    file_bytes = await _read_validated_image(file)
    result = cloudinary_service.upload_image(file_bytes, folder=f"shopnexus/products/{product_id}")

    if not result["success"]:
        # Clear, non-crashing message when Cloudinary isn't configured.
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=result["message"])

    image = ProductImage(product_id=product_id, image_url=result["url"], public_id=result["public_id"])
    db.add(image)
    db.commit()
    db.refresh(image)
    return image
