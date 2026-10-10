from app.core.config import settings
from app.core.constants import ComplaintCategory, ComplaintStatus, Priority, Severity
from app.services.ai_service import AIFallbackClassifier, AIService


def test_fallback_classifier_returns_valid_enums():
    result = AIFallbackClassifier().classify("Someone stole my laptop from the hostel room.")

    assert ComplaintCategory(result["category"])
    assert Severity(result["severity"])
    assert Priority(result["priority"])
    assert result["recommended_department"]
    assert result["summary"]
    assert result["recommended_action"]
    assert isinstance(result["risk_factors"], list) and result["risk_factors"]


def test_fallback_classifier_is_keyword_driven():
    ragging = AIFallbackClassifier().classify("I was ragged by seniors")
    assert ComplaintCategory(ragging["category"]) == ComplaintCategory.RAGGING

    cyber = AIFallbackClassifier().classify("My email account was hacked")
    assert ComplaintCategory(cyber["category"]) == ComplaintCategory.CYBERCRIME

    vague = AIFallbackClassifier().classify("Something vague happened")
    assert ComplaintCategory(vague["category"]) == ComplaintCategory.OTHER


def test_ai_service_without_api_key_uses_fallback():
    assert settings.GEMINI_API_KEY == "", "tests must run with GEMINI_API_KEY disabled"

    service = AIService()
    assert service.client is None

    result = service.analyze_complaint("Broken stairs in Block C", "The stairs collapsed.")
    assert result["used_fallback"] is True
    assert result["ai_model_used"] == "fallback"
    assert ComplaintCategory(result["category"])
    assert Severity(result["severity"])
    assert Priority(result["priority"])


def test_ai_service_recovers_from_invalid_model_output():
    """Any bad upstream payload must fall back instead of raising."""

    class _BrokenGemini:
        def generate_content(self, _prompt):
            class _Response:
                text = "I am not going to return JSON."

            return _Response()

    service = AIService()
    service.client = _BrokenGemini()

    result = service.analyze_complaint("title", "description text")
    assert result["used_fallback"] is True
    assert result["ai_model_used"] == "fallback"


def test_ai_service_rejects_invalid_enum_values():
    """A hallucinated enum value must not leak into the database."""

    class _BadEnumsGemini:
        def generate_content(self, _prompt):
            class _Response:
                text = (
                    '{"category": "SPACE_PIRACY", "severity": "MEGA", "priority": "P9", '
                    '"recommended_department": "Campus Security", "summary": "s", '
                    '"risk_factors": ["r"], "recommended_action": "a"}'
                )

            return _Response()

    service = AIService()
    service.client = _BadEnumsGemini()

    result = service.analyze_complaint("title", "description")
    assert result["used_fallback"] is True


def test_analyze_endpoint_persists_fallback_analysis(client, student):
    headers = {"Authorization": f"Bearer {student['token']}"}
    created = client.post(
        "/api/v1/complaints/",
        data={
            "title": "Chain snatched near the gate",
            "description": "A chain was snatched near the main gate at night.",
        },
        headers=headers,
    )
    assert created.status_code == 201
    complaint_id = created.json()["id"]

    resp = client.post(f"/api/v1/complaints/{complaint_id}/analyze", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["analysis"]["used_fallback"] is True
    assert body["analysis"]["ai_model_used"] == "fallback"

    detail = client.get(f"/api/v1/complaints/{complaint_id}", headers=headers).json()
    assert detail["status"] == ComplaintStatus.AI_ANALYZED.value
    assert detail["analysis"]["used_fallback"] is True
