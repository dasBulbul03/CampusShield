from tests.conftest import auth_header, login, register_user


def test_register_returns_token_and_defaults_to_student(client):
    token_data, email = register_user(client)
    assert token_data["token_type"] == "bearer"
    assert token_data["role"] == "STUDENT"
    assert token_data["full_name"] == "Test Student"
    assert token_data["access_token"]


def test_register_rejects_duplicate_email(client):
    _, email = register_user(client, email="student-dup@test.dev")

    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "passw0rd!",
            "full_name": "Dup",
        },
    )
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


def test_login_success_and_failure(client):
    _, email = register_user(client)

    ok = login(client, email)
    assert ok["access_token"]

    bad = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "wrong-password"},
    )
    assert bad.status_code == 401

    unknown = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@test.dev", "password": "whatever"},
    )
    assert unknown.status_code == 401


def test_protected_routes_reject_missing_or_bad_token(client, student):
    headers = auth_header(student["token"])
    assert client.get("/api/v1/complaints/my", headers=headers).status_code == 200

    assert client.get("/api/v1/complaints/my").status_code in (401, 403)
    assert (
        client.get("/api/v1/complaints/my", headers=auth_header("not-a-real-token")).status_code
        in (401, 403)
    )


def test_admin_endpoints_forbidden_for_students(client, student):
    headers = auth_header(student["token"])
    for path in ("/api/v1/admin/dashboard", "/api/v1/admin/complaints", "/api/v1/admin/analytics"):
        resp = client.get(path, headers=headers)
        assert resp.status_code == 403, f"{path} -> {resp.status_code}"
