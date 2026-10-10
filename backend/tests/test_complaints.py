from tests.conftest import auth_header, register_user


def _create(client, token, **overrides):
    payload = {
        "title": "Harassment near the library",
        "description": "A senior has been repeatedly harassing me near the library entrance.",
        "category": "HARASSMENT",
        "location": "Central Library",
    }
    payload.update(overrides)
    resp = client.post(
        "/api/v1/complaints/",
        data=payload,
        headers=auth_header(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_complaint_returns_complaint_number(client, student):
    body = _create(client, student["token"])
    assert body["id"] > 0
    assert body["complaint_number"].startswith("CS-")


def test_incident_date_is_persisted(client, student):
    body = _create(client, student["token"], incident_date="2026-10-01T10:30:00")
    detail = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    ).json()

    assert detail["incident_date"] is not None
    assert detail["incident_date"].startswith("2026-10-01T10:30:00")


def test_invalid_incident_date_is_stored_as_null(client, student):
    body = _create(client, student["token"], incident_date="not-a-date")
    detail = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    ).json()

    assert detail["incident_date"] is None


def test_invalid_category_does_not_crash(client, student):
    body = _create(client, student["token"], category="NOT_A_REAL_CATEGORY")
    detail = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    ).json()

    assert detail["category"] is None
    assert detail["status"] == "SUBMITTED"


def test_students_cannot_read_other_students_complaints(client, student):
    other_token_data, _ = register_user(client)
    body = _create(client, other_token_data["access_token"])

    resp = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    )
    assert resp.status_code == 403


def test_missing_complaint_returns_404(client, student):
    resp = client.get("/api/v1/complaints/999999", headers=auth_header(student["token"]))
    assert resp.status_code == 404


def test_my_complaints_only_returns_own(client, student):
    _create(client, student["token"], title="Mine 1")
    _create(client, student["token"], title="Mine 2")

    mine = client.get("/api/v1/complaints/my", headers=auth_header(student["token"])).json()
    assert len(mine) == 2
    assert {c["title"] for c in mine} == {"Mine 1", "Mine 2"}


def test_evidence_rejects_disallowed_extension(client, student):
    resp = client.post(
        "/api/v1/complaints/",
        data={"title": "Bad file", "description": "malware upload attempt"},
        files={"evidence": ("payload.exe", b"MZ binary", "application/octet-stream")},
        headers=auth_header(student["token"]),
    )
    assert resp.status_code == 400
    assert "File type not allowed" in resp.json()["detail"]


def test_evidence_rejects_empty_file(client, student):
    resp = client.post(
        "/api/v1/complaints/",
        data={"title": "Empty file", "description": "no content"},
        files={"evidence": ("empty.png", b"", "image/png")},
        headers=auth_header(student["token"]),
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_evidence_rejects_oversized_file(client, student, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_FILE_SIZE", 1024)

    resp = client.post(
        "/api/v1/complaints/",
        data={"title": "Big file", "description": "too large"},
        files={"evidence": ("big.png", b"x" * 4096, "image/png")},
        headers=auth_header(student["token"]),
    )
    assert resp.status_code == 400
    assert "size limit" in resp.json()["detail"]


def test_valid_evidence_is_stored_and_downloadable(client, student):
    headers = auth_header(student["token"])

    upload = client.post(
        "/api/v1/complaints/",
        data={"title": "With photo", "description": "photo attached"},
        files={"evidence": ("proof.png", b"fake-png-bytes", "image/png")},
        headers=headers,
    )
    assert upload.status_code == 201
    cid = upload.json()["id"]

    detail = client.get(f"/api/v1/complaints/{cid}", headers=headers).json()
    assert len(detail["evidence"]) == 1
    ev = detail["evidence"][0]
    assert ev["filename"] == "proof.png"
    assert ev["file_size"] == len(b"fake-png-bytes")
    assert ev["file_type"] == "image/png"

    download = client.get(f"/api/v1/complaints/{cid}/evidence/{ev['id']}", headers=headers)
    assert download.status_code == 200
    assert download.content == b"fake-png-bytes"


def test_evidence_download_is_denied_for_other_students(client, student):
    headers = auth_header(student["token"])
    upload = client.post(
        "/api/v1/complaints/",
        data={"title": "Private photo", "description": "mine"},
        files={"evidence": ("secret.png", b"private-bytes", "image/png")},
        headers=headers,
    )
    cid = upload.json()["id"]
    ev_id = client.get(f"/api/v1/complaints/{cid}", headers=headers).json()["evidence"][0]["id"]

    other_token_data, _ = register_user(client)
    denied = client.get(
        f"/api/v1/complaints/{cid}/evidence/{ev_id}",
        headers=auth_header(other_token_data["access_token"]),
    )
    assert denied.status_code == 403
