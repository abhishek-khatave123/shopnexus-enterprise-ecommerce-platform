def test_customer_cannot_access_admin_customers_list(client):
    reg = client.post("/api/auth/register", json={"name": "Reg", "email": "reg@test.com", "password": "RegPass123"})
    token = reg.json()["access_token"]
    resp = client.get("/api/admin/customers", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_customer_cannot_create_product(client):
    reg = client.post("/api/auth/register", json={"name": "Reg2", "email": "reg2@test.com", "password": "RegPass123"})
    token = reg.json()["access_token"]
    resp = client.post(
        "/api/products",
        json={"name": "X", "price": 10.0, "sku": "SKU-X", "category_id": 1, "stock_quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_unauthenticated_request_to_protected_route_rejected(client):
    resp = client.get("/api/cart")
    assert resp.status_code == 401


def test_health_check_public(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
