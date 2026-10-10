import json
import logging
from typing import Dict, Any, List
from app.core.config import settings
from app.core.constants import ComplaintCategory, Severity, Priority

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are CampusShield AI - an AI-assisted campus safety and grievance analysis system.

CORE PRINCIPLES:
- AI assists. Humans decide. Never represent AI recommendations as verified facts.
- Analyze ONLY the information supplied in the complaint. Do NOT invent facts or evidence.
- Clearly distinguish reported claims from verified facts.
- Never determine guilt, make legal judgments, assign punishment, or accuse anyone.
- Never contact authorities or suggest automatic police involvement.
- Provide operational/recommended actions only for campus administration.
- Return valid structured JSON only. No extra text, explanations outside JSON, or markdown.

ALLOWED VALUES:
Categories: HARASSMENT, RAGGING, THREAT, THEFT, CYBERCRIME, BULLYING, HOSTEL_SAFETY, INFRASTRUCTURE, ACADEMIC, OTHER
Severity: LOW, MEDIUM, HIGH, CRITICAL
Priority: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)

TASK:
Analyze the student complaint and return a JSON object with exactly these fields:
{
  "category": "one of allowed categories",
  "severity": "one of allowed severities",
  "priority": "one of allowed priorities (map CRITICAL->P1, HIGH->P2, MEDIUM->P3, LOW->P4)",
  "recommended_department": "one of: Campus Security, Student Welfare, Anti-Ragging Committee, IT / Cybersecurity, Hostel Administration, Academic Administration, Facilities",
  "summary": "Concise 1-2 sentence summary of the reported incident. Use 'Student reports...' phrasing.",
  "risk_factors": ["array of 2-3 short risk factors based on reported claims only"],
  "recommended_action": "Practical recommended next step for administration"
}

RULES:
- Be conservative and safety-oriented.
- Use "reported" language, avoid confirmed/verified language in summary.
- Map severity to priority: CRITICAL->P1, HIGH->P2, MEDIUM->P3, LOW->P4.
- Pick most appropriate department based on category.
- Never fabricate specifics. If unclear, use OTHER category cautiously.
- Return ONLY valid JSON matching schema."""

DEPARTMENT_MAP = {
    ComplaintCategory.HARASSMENT: "Student Welfare",
    ComplaintCategory.RAGGING: "Anti-Ragging Committee",
    ComplaintCategory.THREAT: "Campus Security",
    ComplaintCategory.THEFT: "Campus Security",
    ComplaintCategory.CYBERCRIME: "IT / Cybersecurity",
    ComplaintCategory.BULLYING: "Student Welfare",
    ComplaintCategory.HOSTEL_SAFETY: "Hostel Administration",
    ComplaintCategory.INFRASTRUCTURE: "Facilities",
    ComplaintCategory.ACADEMIC: "Academic Administration",
    ComplaintCategory.OTHER: "Student Welfare",
}

SEVERITY_PRIORITY_MAP = {
    Severity.CRITICAL: Priority.P1,
    Severity.HIGH: Priority.P2,
    Severity.MEDIUM: Priority.P3,
    Severity.LOW: Priority.P4,
}


class AIFallbackClassifier:
    def classify(self, description: str) -> Dict[str, Any]:
        text = description.lower() if description else ""
        if any(k in text for k in ["stolen", "robbed", "theft", "pickpocket", "missing item"]):
            cat = ComplaintCategory.THEFT
            sev = Severity.MEDIUM
        elif any(k in text for k in ["kill", "murder", "weapon", "gun", "knife", "threatened to harm", "threaten"]):
            cat = ComplaintCategory.THREAT
            sev = Severity.HIGH
        elif any(k in text for k in ["ragging", "ragged", "senior forcing", "hazed"]):
            cat = ComplaintCategory.RAGGING
            sev = Severity.HIGH
        elif any(k in text for k in ["hack", "hacked", "fake account", "phishing", "cyber", "instagram", "data breach"]):
            cat = ComplaintCategory.CYBERCRIME
            sev = Severity.MEDIUM
        elif any(k in text for k in ["bully", "bullying"]):
            cat = ComplaintCategory.BULLYING
            sev = Severity.MEDIUM
        elif any(k in text for k in ["harass", "harassment", "unwelcome", "inappropriate touch"]):
            cat = ComplaintCategory.HARASSMENT
            sev = Severity.HIGH
        elif any(k in text for k in ["hostel", "room", "mess", "water", "electric", "bathroom", "warden"]):
            cat = ComplaintCategory.HOSTEL_SAFETY
            sev = Severity.LOW
        elif any(k in text for k in ["infrastructure", "road", "light", "building", "repair", "broken"]):
            cat = ComplaintCategory.INFRASTRUCTURE
            sev = Severity.LOW
        elif any(k in text for k in ["exam", "grade", "teacher", "professor", "marks", "academic"]):
            cat = ComplaintCategory.ACADEMIC
            sev = Severity.LOW
        else:
            cat = ComplaintCategory.OTHER
            sev = Severity.LOW

        dept = DEPARTMENT_MAP.get(cat, "Student Welfare")
        prio = SEVERITY_PRIORITY_MAP.get(sev, Priority.P4)

        return {
            "category": cat.value,
            "severity": sev.value,
            "priority": prio.value,
            "recommended_department": dept,
            "summary": f"Student reports a {cat.value.replace('_', ' ').lower()} related concern.",
            "risk_factors": ["Reported concern requiring review", "Potential safety impact"],
            "recommended_action": "Review and assign to appropriate department for follow-up.",
            "used_fallback": True,
        }


class AIService:
    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(self.model_name)
                logger.info(f"Gemini client initialized with model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None

    def analyze_complaint(self, title: str, description: str, location: str = None) -> Dict[str, Any]:
        full_text = f"Title: {title}\n\nDescription: {description}"
        if location:
            full_text += f"\n\nLocation: {location}"

        if not self.client:
            logger.warning("Gemini not available, using fallback")
            result = AIFallbackClassifier().classify(description)
            result["ai_model_used"] = "fallback"
            return result

        try:
            response = self.client.generate_content(
                f"{SYSTEM_PROMPT}\n\n---\n\nCOMPLAINT:\n{full_text}\n\n---\n\nReturn ONLY valid JSON."
            )
            text = response.text.strip()

            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"):
                    text = text[4:].strip()

            data = json.loads(text)

            required = ["category", "severity", "priority", "recommended_department", "summary", "risk_factors", "recommended_action"]
            for r in required:
                if r not in data:
                    raise ValueError(f"Missing field: {r}")

            for field, enum_cls in (("category", ComplaintCategory), ("severity", Severity), ("priority", Priority)):
                try:
                    enum_cls(str(data[field]).strip())
                except ValueError:
                    raise ValueError(f"Invalid {field}: {data[field]!r}")

            data["used_fallback"] = False
            data["ai_model_used"] = self.model_name
            return data
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            result = AIFallbackClassifier().classify(description)
            result["ai_model_used"] = "fallback"
            return result
