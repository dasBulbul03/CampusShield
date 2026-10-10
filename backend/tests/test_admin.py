from tests.conftest import auth_header, login, register_user


def _create(client, token, title="Complaint", description="Something happened on campus."):
    resp = client.post(
        "/api/v1/complaints/",
        data={"title": title, "description": description},
        headers=auth_header(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _admin_get(client, admin, path, **params):
    return client.get(path, params=params or None, headers=auth_header(admin["token"]))


def test_admin_list_is_paginated(client, admin, student):
    for i in range(5):
        _create(client, student["token"], title=f"Paginated {i}")

    page1 = _admin_get(client, admin, "/api/v1/admin/complaints", page=1, page_size=2).json()
    assert set(page1) == {"items", "total", "page", "page_size", "pages"}
    assert page1["total"] == 5
    assert page1["page"] == 1
    assert page1["page_size"] == 2
    assert page1["pages"] == 3
    assert len(page1["items"]) == 2

    page3 = _admin_get(client, admin, "/api/v1/admin/complaints", page=3, page_size=2).json()
    assert len(page3["items"]) == 1


def test_admin_list_clamps_out_of_range_page(client, admin, student):
    _create(client, student["token"])

    resp = _admin_get(client, admin, "/api/v1/admin/complaints", page=99, page_size=20).json()
    assert resp["page"] == 1
    assert len(resp["items"]) == 1


def test_admin_list_rejects_invalid_pagination(client, admin):
    assert _admin_get(client, admin, "/api/v1/admin/complaints", page=0).status_code == 422
    assert _admin_get(client, admin, "/api/v1/admin/complaints", page_size=0).status_code == 422
    assert _admin_get(client, admin, "/api/v1/admin/complaints", page_size=101).status_code == 422


def test_admin_list_filters_by_search(client, admin, student):
    _create(client, student["token"], title="UniqueZebra incident")
    _create(client, student["token"], title="Ordinary incident")

    resp = _admin_get(client, admin, "/api/v1/admin/complaints", search="UniqueZebra").json()
    assert resp["total"] == 1
    assert resp["items"][0]["title"] == "UniqueZebra incident"


def test_admin_list_rejects_invalid_enum_filters(client, admin):
    assert _admin_get(client, admin, "/api/v1/admin/complaints", status="BOGUS").status_code == 400
    assert _admin_get(client, admin, "/api/v1/admin/complaints", priority="P9").status_code == 400
    assert (
        _admin_get(client, admin, "/api/v1/admin/complaints", category="NOT_A_CATEGORY").status_code
        == 400
    )


def test_admin_list_filters_by_valid_status(client, admin, student):
    _create(client, student["token"], title="Will stay submitted")
    _create(client, student["token"], title="Will be analyzed")

    targets = client.get("/api/v1/complaints/my", headers=auth_header(student["token"])).json()
    for c in targets:
        if c["title"] == "Will be analyzed":
            client.post(
                f"/api/v1/complaints/{c['id']}/analyze", headers=auth_header(student["token"])
            )

    resp = _admin_get(client, admin, "/api/v1/admin/complaints", status="AI_ANALYZED").json()
    assert resp["total"] == 1
    assert resp["items"][0]["title"] == "Will be analyzed"


def test_admin_can_read_any_complaint(client, admin, student):
    body = _create(client, student["token"], title="Admin can see this")

    resp = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(admin["token"])
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Admin can see this"


def test_departments_are_seeded(client, admin):
    resp = _admin_get(client, admin, "/api/v1/admin/departments")
    assert resp.status_code == 200
    names = {d["name"] for d in resp.json()}
    assert {"Campus Security", "Student Welfare", "Anti-Ragging Committee"} <= names


def test_assign_complaint_sets_department_and_notifies(client, admin, student):
    body = _create(client, student["token"])
    departments = _admin_get(client, admin, "/api/v1/admin/departments").json()
    dept_id = next(d["id"] for d in departments if d["name"] == "Campus Security")

    resp = client.post(
        f"/api/v1/complaints/{body['id']}/assign",
        data={"department_id": dept_id, "severity": "HIGH", "priority": "P2"},
        headers=auth_header(admin["token"]),
    )
    assert resp.status_code == 200

    detail = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    ).json()
    assert detail["department"] == "Campus Security"
    assert detail["department_id"] == dept_id
    assert detail["severity"] == "HIGH"
    assert detail["priority"] == "P2"

    notifications = client.get(
        "/api/v1/notifications/", headers=auth_header(student["token"])
    ).json()
    assert notifications["unread_count"] == 1
    assert "assigned to Campus Security" in notifications["items"][0]["message"]


def test_status_update_is_admin_only(client, admin, student):
    body = _create(client, student["token"])

    forbidden = client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "UNDER_REVIEW", "note": "student tries to self-escalate"},
        headers=auth_header(student["token"]),
    )
    assert forbidden.status_code == 403

    ok = client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "UNDER_REVIEW", "note": "Under review by admin"},
        headers=auth_header(admin["token"]),
    )
    assert ok.status_code == 200

    detail = client.get(
        f"/api/v1/complaints/{body['id']}", headers=auth_header(student["token"])
    ).json()
    assert detail["status"] == "UNDER_REVIEW"
    assert detail["updates"][-1]["note"] == "Under review by admin"


def test_status_update_rejects_unknown_status(client, admin, student):
    body = _create(client, student["token"])
    resp = client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "NONSENSE", "note": "x"},
        headers=auth_header(admin["token"]),
    )
    assert resp.status_code == 400


def test_notifications_are_scoped_to_the_user(client, admin, student):
    body = _create(client, student["token"])
    client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "UNDER_REVIEW", "note": "n"},
        headers=auth_header(admin["token"]),
    )

    student_notifs = client.get(
        "/api/v1/notifications/", headers=auth_header(student["token"])
    ).json()
    admin_notifs = client.get(
        "/api/v1/notifications/", headers=auth_header(admin["token"])
    ).json()

    assert student_notifs["unread_count"] == 1
    assert admin_notifs["unread_count"] == 0
    assert admin_notifs["items"] == []


def test_notifications_limit_is_clamped(client, student):
    resp = client.get(
        "/api/v1/notifications/", params={"limit": 9999}, headers=auth_header(student["token"])
    )
    assert resp.status_code == 200
    assert resp.json() == {"items": [], "unread_count": 0}

    resp = client.get(
        "/api/v1/notifications/", params={"limit": -5}, headers=auth_header(student["token"])
    )
    assert resp.status_code == 200


def test_mark_all_read_and_single_read(client, admin, student):
    body = _create(client, student["token"])
    for status_val in ("AI_ANALYZED", "UNDER_REVIEW"):
        client.post(
            f"/api/v1/complaints/{body['id']}/status",
            data={"status_val": status_val, "note": status_val},
            headers=auth_header(admin["token"]),
        )

    notifs = client.get(
        "/api/v1/notifications/", headers=auth_header(student["token"])
    ).json()
    assert notifs["unread_count"] == 2

    single = client.post(
        f"/api/v1/notifications/{notifs['items'][0]['id']}/read",
        headers=auth_header(student["token"]),
    )
    assert single.status_code == 200
    assert single.json()["unread_count"] == 1

    assert (
        client.post(
            "/api/v1/notifications/999999/read", headers=auth_header(student["token"])
        ).status_code
        == 404
    )

    all_read = client.post(
        "/api/v1/notifications/read-all", headers=auth_header(student["token"])
    )
    assert all_read.status_code == 200
    assert all_read.json()["unread_count"] == 0


def test_feedback_requires_resolved_status(client, admin, student):
    body = _create(client, student["token"])

    resp = client.post(
        f"/api/v1/complaints/{body['id']}/feedback",
        data={"rating": 5, "comment": "too early"},
        headers=auth_header(student["token"]),
    )
    assert resp.status_code == 400
    assert "resolved" in resp.json()["detail"].lower()


def test_feedback_flow_end_to_end(client, admin, student):
    body = _create(client, student["token"])
    headers = auth_header(student["token"])

    client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "RESOLVED", "note": "Closed"},
        headers=auth_header(admin["token"]),
    )

    submitted = client.post(
        f"/api/v1/complaints/{body['id']}/feedback",
        data={"rating": 4, "comment": "Handled quickly"},
        headers=headers,
    )
    assert submitted.status_code == 200
    assert submitted.json()["feedback"]["rating"] == 4

    detail = client.get(f"/api/v1/complaints/{body['id']}", headers=headers).json()
    assert detail["feedback"] is not None
    assert detail["feedback"]["comment"] == "Handled quickly"

    fetched = client.get(f"/api/v1/complaints/{body['id']}/feedback", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["feedback"]["rating"] == 4

    duplicate = client.post(
        f"/api/v1/complaints/{body['id']}/feedback",
        data={"rating": 1, "comment": "again"},
        headers=headers,
    )
    assert duplicate.status_code == 400
    assert "already" in duplicate.json()["detail"].lower()


def test_feedback_rejects_out_of_range_rating(client, admin, student):
    body = _create(client, student["token"])
    client.post(
        f"/api/v1/complaints/{body['id']}/status",
        data={"status_val": "RESOLVED", "note": "Closed"},
        headers=auth_header(admin["token"]),
    )

    for rating in ("0", "6"):
        resp = client.post(
            f"/api/v1/complaints/{body['id']}/feedback",
            data={"rating": rating, "comment": "bad rating"},
            headers=auth_header(student["token"]),
        )
        assert resp.status_code == 400
        assert "1-5" in resp.json()["detail"]


def test_feedback_is_not_visible_to_other_students(client, student):
    other_token_data, _ = register_user(client)
    body = _create(client, other_token_data["access_token"])

    resp = client.get(
        f"/api/v1/complaints/{body['id']}/feedback", headers=auth_header(student["token"])
    )
    assert resp.status_code == 403


def test_admin_dashboard_and_analytics_shapes(client, admin, student):
    _create(client, student["token"])

    dashboard = _admin_get(client, admin, "/api/v1/admin/dashboard")
    assert dashboard.status_code == 200
    assert isinstance(dashboard.json(), dict)

    analytics = _admin_get(client, admin, "/api/v1/admin/analytics")
    assert analytics.status_code == 200
    assert isinstance(analytics.json(), dict)


def test_demo_seed_users_can_log_in(client):
    admin_token = login(client, "admin@campusshield.demo", "admin123")
    assert admin_token["role"] == "ADMIN"

    student_token = login(client, "student@campusshield.demo", "student123")
    assert student_token["role"] == "STUDENT"
