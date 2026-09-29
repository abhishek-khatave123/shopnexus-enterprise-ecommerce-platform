from unittest.mock import patch

from app.core.security import hash_password
from app.models.category import Category
from app.models.product import Product
from app.models.role import Role
from app.models.user import User


def _admin_token(client, db_session, email="upload-admin@test.com"):
    role = db_session.query(Role).filter(Role.name == "ADMIN").first()
    admin = User(name="Upload Admin", email=email, password_hash=hash_password("AdminPass1"), role_id=role.id)
    db_session.add(admin)
    db_session.commit()
    response = client.post("/api/auth/login", json={"email": email, "password": "AdminPass1"})
    return response.json()["access_token"]


def _product(db_session, suffix="default"):
    category = Category(name=f"Upload Category {suffix}", slug=f"upload-category-{suffix}")
    db_session.add(category)
    db_session.commit()
    product = Product(
        name=f"Upload Product {suffix}",
        slug=f"upload-product-{suffix}",
        price=10,
        sku=f"UPLOAD-{suffix.upper()}",
        category_id=category.id,
        stock_quantity=1,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def _upload(client, db_session, file_bytes, content_type, filename="image.bin"):
    suffix = filename.replace(".", "-")
    email = f"{suffix}@test.com"
    token = _admin_token(client, db_session, email)
    product = _product(db_session, suffix)
    return client.post(
        f"/api/uploads/product-image?product_id={product.id}",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, file_bytes, content_type)},
    )


@patch("app.api.uploads.cloudinary_service.upload_image")
def test_valid_jpeg_png_and_webp_uploads(mock_upload, client, db_session):
    mock_upload.return_value = {"success": True, "url": "https://example.com/image", "public_id": "products/image"}
    valid_images = [
        (b"\xff\xd8\xff\xe0jpeg", "image/jpeg", "image.jpg"),
        (b"\x89PNG\r\n\x1a\npng", "image/png", "image.png"),
        (b"RIFF\x04\x00\x00\x00WEBPwebp", "image/webp", "image.webp"),
    ]

    for file_bytes, content_type, filename in valid_images:
        response = _upload(client, db_session, file_bytes, content_type, filename)
        assert response.status_code == 200

    assert mock_upload.call_count == 3


def test_unsupported_file_type_rejected_before_cloudinary(client, db_session):
    with patch("app.api.uploads.cloudinary_service.upload_image") as mock_upload:
        response = _upload(client, db_session, b"plain text", "text/plain", "image.jpg")

    assert response.status_code == 415
    assert "Unsupported image type" in response.json()["message"]
    mock_upload.assert_not_called()


def test_oversized_file_rejected_before_cloudinary(client, db_session):
    with patch("app.api.uploads.cloudinary_service.upload_image") as mock_upload:
        response = _upload(client, db_session, b"\xff\xd8\xff" + b"x" * (5 * 1024 * 1024), "image/jpeg", "large.jpg")

    assert response.status_code == 413
    assert "5 MB" in response.json()["message"]
    mock_upload.assert_not_called()


def test_empty_file_rejected_before_cloudinary(client, db_session):
    with patch("app.api.uploads.cloudinary_service.upload_image") as mock_upload:
        response = _upload(client, db_session, b"", "image/jpeg", "empty.jpg")

    assert response.status_code == 400
    assert response.json()["message"] == "Uploaded image is empty"
    mock_upload.assert_not_called()


def test_missing_file_rejected_before_cloudinary(client, db_session):
    token = _admin_token(client, db_session, "missing-file@test.com")
    product = _product(db_session, "missing-file")
    with patch("app.api.uploads.cloudinary_service.upload_image") as mock_upload:
        response = client.post(
            f"/api/uploads/product-image?product_id={product.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 422
    assert response.json()["message"] == "Validation error"
    mock_upload.assert_not_called()


def test_mismatched_image_content_rejected_before_cloudinary(client, db_session):
    with patch("app.api.uploads.cloudinary_service.upload_image") as mock_upload:
        response = _upload(client, db_session, b"not-a-jpeg", "image/jpeg", "image.jpg")

    assert response.status_code == 415
    assert "Invalid JPEG image content" in response.json()["message"]
    mock_upload.assert_not_called()
