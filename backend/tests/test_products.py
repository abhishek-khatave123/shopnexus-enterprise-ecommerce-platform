from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.models.category import Category


def _make_admin(db_session):
    role = db_session.query(Role).filter(Role.name == "ADMIN").first()
    admin = User(name="Admin", email="admin@test.com", password_hash=hash_password("AdminPass1"), role_id=role.id)
    db_session.add(admin)
    db_session.commit()
    return admin


def _admin_token(client, db_session):
    _make_admin(db_session)
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "AdminPass1"})
    return resp.json()["access_token"]


def _make_category(db_session):
    cat = Category(name="Electronics", slug="electronics")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


def test_create_product_as_admin(client, db_session):
    token = _admin_token(client, db_session)
    category = _make_category(db_session)
    resp = client.post(
        "/api/products",
        json={"name": "Test Product", "price": 999.0, "sku": "SKU-001", "category_id": category.id, "stock_quantity": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["sku"] == "SKU-001"


def test_create_product_as_customer_forbidden(client, db_session):
    _make_category(db_session)
    reg = client.post("/api/auth/register", json={"name": "Cust", "email": "cust@test.com", "password": "CustPass1"})
    token = reg.json()["access_token"]
    resp = client.post(
        "/api/products",
        json={"name": "Test Product", "price": 999.0, "sku": "SKU-002", "category_id": 1, "stock_quantity": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_list_and_get_product(client, db_session):
    token = _admin_token(client, db_session)
    category = _make_category(db_session)
    created = client.post(
        "/api/products",
        json={"name": "Listed Product", "price": 500.0, "sku": "SKU-003", "category_id": category.id, "stock_quantity": 5},
        headers={"Authorization": f"Bearer {token}"},
    ).json()

    list_resp = client.get("/api/products")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    get_resp = client.get(f"/api/products/{created['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Listed Product"


def test_get_nonexistent_product_404(client):
    resp = client.get("/api/products/9999")
    assert resp.status_code == 404
