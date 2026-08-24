from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/internal/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_prescription() -> None:
    files = {
        "image": (
            "prescription.png",
            b"image-bytes",
            "image/png",
        )
    }
    response = client.post(
        "/internal/v1/prescriptions/analyze",
        files=files,
    )

    assert response.status_code == 200
    assert response.json()["medications"][0]["medicationName"] == "예시약"


def test_chat() -> None:
    request_body = {
        "visitId": 1,
        "question": "복용 후 졸린데 괜찮나요?",
        "medications": [
            {
                "name": "예시약",
                "dosage": "1정",
                "instructions": "식후 30분",
            }
        ],
    }
    response = client.post("/internal/v1/chat", json=request_body)

    assert response.status_code == 200
    assert "answer" in response.json()
    assert response.json()["sources"]


def test_generate_report() -> None:
    request_body = {
        "visitId": 1,
        "visit": {
            "hospitalName": "예시병원",
            "departmentName": "내과",
            "visitReason": "기침",
            "medicationStartDate": "2026-08-24",
            "medicationEndDate": "2026-08-30",
        },
        "medications": [
            {
                "name": "예시약",
                "dosage": "1정",
                "purpose": "증상 완화",
            }
        ],
        "healthLogs": [
            {
                "recordedAt": "2026-08-24T21:00:00",
                "symptomName": "기침",
                "symptomSeverity": 8,
                "sideEffects": "졸림",
                "bodyTemperature": 38.0,
                "sleepHours": 6.0,
                "waterIntakeMl": 1200,
                "activityMinutes": 10,
            },
            {
                "recordedAt": "2026-08-30T21:00:00",
                "symptomName": "기침",
                "symptomSeverity": 3,
                "sideEffects": None,
                "bodyTemperature": 36.8,
                "sleepHours": 7.0,
                "waterIntakeMl": 1800,
                "activityMinutes": 30,
            }
        ],
        "doses": [
            {
                "scheduledAt": "2026-08-24T09:00:00",
                "doseStatus": "TAKEN",
            },
            {
                "scheduledAt": "2026-08-24T13:00:00",
                "doseStatus": "SKIPPED",
            },
            {
                "scheduledAt": "2026-08-24T19:00:00",
                "doseStatus": "TAKEN",
            }
        ],
    }
    response = client.post(
        "/internal/v1/reports/generate",
        json=request_body,
    )

    assert response.status_code == 200
    assert "66.7%" in response.json()["summary"]
    assert "호전" in response.json()["symptomChanges"]
    assert "졸림" in response.json()["suspectedSideEffects"]
    assert "평균 수면" in response.json()["lifestyleSummary"]
    assert response.json()["adherenceRate"] == 66.7
    assert "66.7%" in response.json()["doctorNotes"]


def test_compare_treatments() -> None:
    request_body = {
        "current": {
            "visitId": 2,
            "hospitalName": "현재병원",
            "medicationNames": ["공통약", "현재약"],
            "initialSeverity": 8,
            "finalSeverity": 3,
            "finalStatus": "호전",
            "medicationStartDate": "2026-08-24",
            "medicationEndDate": "2026-08-30",
        },
        "past": {
            "visitId": 1,
            "hospitalName": "과거병원",
            "medicationNames": ["공통약", "과거약"],
            "initialSeverity": 7,
            "finalSeverity": 4,
            "finalStatus": "호전",
            "medicationStartDate": "2026-02-01",
            "medicationEndDate": "2026-02-05",
        },
    }
    response = client.post(
        "/internal/v1/treatments/compare",
        json=request_body,
    )

    assert response.status_code == 200
    assert "공통약" in response.json()["commonPoints"][0]
