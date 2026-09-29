def test_register_new_user(client):
    resp = client.post(
        "/api/auth/register",
        json={"name": "John Doe", "email": "john@example.com", "password": "StrongPass1"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body


def test_register_duplicate_email_rejected(client):
    payload = {"name": "Jane Doe", "email": "jane@example.com", "password": "StrongPass1"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "StrongPass1"},
    )
    resp = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "StrongPass1"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_rejected(client):
    client.post(
        "/api/auth/register",
        json={"name": "Bob", "email": "bob@example.com", "password": "StrongPass1"},
    )
    resp = client.post("/api/auth/login", json={"email": "bob@example.com", "password": "WrongPass"})
    assert resp.status_code == 401


def test_get_current_user(client):
    reg = client.post(
        "/api/auth/register",
        json={"name": "Carol", "email": "carol@example.com", "password": "StrongPass1"},
    )
    token = reg.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "carol@example.com"
    assert resp.json()["role"] == "CUSTOMER"


def test_get_current_user_without_token_rejected(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
