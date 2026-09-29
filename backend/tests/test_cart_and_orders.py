from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.models.category import Category


def _admin_token(client, db_session):
    role = db_session.query(Role).filter(Role.name == "ADMIN").first()
    admin = User(name="Admin", email="admin2@test.com", password_hash=hash_password("AdminPass1"), role_id=role.id)
    db_session.add(admin)
    db_session.commit()
    return client.post("/api/auth/login", json={"email": "admin2@test.com", "password": "AdminPass1"}).json()["access_token"]


def _customer_token(client):
    reg = client.post("/api/auth/register", json={"name": "Shopper", "email": "shopper@test.com", "password": "ShopPass1"})
    return reg.json()["access_token"]


def _create_product(client, admin_token, db_session, stock=10):
    cat = Category(name="Books", slug="books")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    resp = client.post(
        "/api/products",
        json={"name": "Cart Product", "price": 100.0, "sku": "SKU-CART-01", "category_id": cat.id, "stock_quantity": stock},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return resp.json()


def test_add_to_cart_and_view(client, db_session):
    admin_token = _admin_token(client, db_session)
    product = _create_product(client, admin_token, db_session)
    cust_token = _customer_token(client)

    resp = client.post(
        "/api/cart/items",
        json={"product_id": product["id"], "quantity": 2},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["items"][0]["quantity"] == 2

    cart = client.get("/api/cart", headers={"Authorization": f"Bearer {cust_token}"})
    assert cart.status_code == 200
    assert len(cart.json()["items"]) == 1


def test_cannot_add_more_than_stock(client, db_session):
    admin_token = _admin_token(client, db_session)
    product = _create_product(client, admin_token, db_session, stock=2)
    cust_token = _customer_token(client)

    resp = client.post(
        "/api/cart/items",
        json={"product_id": product["id"], "quantity": 5},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert resp.status_code == 400


def test_checkout_creates_order(client, db_session):
    admin_token = _admin_token(client, db_session)
    product = _create_product(client, admin_token, db_session, stock=10)
    cust_token = _customer_token(client)

    client.post(
        "/api/cart/items",
        json={"product_id": product["id"], "quantity": 3},
        headers={"Authorization": f"Bearer {cust_token}"},
    )

    order_resp = client.post(
        "/api/orders",
        json={
            "address": {
                "full_name": "Shopper",
                "phone": "9999999999",
                "line1": "1 Test St",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560001",
                "country": "India",
            }
        },
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert order_resp.status_code == 201
    body = order_resp.json()
    assert body["order_status"] == "PENDING"
    assert body["payment_status"] == "PENDING"
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 3

    # Cart should be empty after checkout
    cart = client.get("/api/cart", headers={"Authorization": f"Bearer {cust_token}"})
    assert len(cart.json()["items"]) == 0


def test_checkout_with_empty_cart_fails(client, db_session):
    cust_token = _customer_token(client)
    resp = client.post(
        "/api/orders",
        json={
            "address": {
                "full_name": "Shopper",
                "phone": "9999999999",
                "line1": "1 Test St",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postal_code": "560001",
                "country": "India",
            }
        },
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert resp.status_code == 400
