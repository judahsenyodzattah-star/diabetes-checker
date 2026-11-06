"""API behaviour: contract shape, mock labelling, determinism, metrics, privacy."""

import json
import logging

from app.features import FEATURE_ORDER, FEATURES

URL = "/api/v1/predict"


def test_health_reports_mock_mode(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["model"]["mode"] == "mock"
    assert body["model"]["is_demonstration"] is True


def test_prediction_response_contract(client, valid_payload):
    r = client.post(URL, json=valid_payload)
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"request_id", "prediction", "model", "disclaimer"}
    assert body["prediction"]["label"] in ("diabetes", "no_diabetes")
    assert body["prediction"]["positive_class"] == (body["prediction"]["label"] == "diabetes")
    assert 0 <= body["prediction"]["probability"] <= 1
    assert r.headers["cache-control"] == "no-store"


def test_every_mock_prediction_is_labelled_demonstration(client, valid_payload):
    body = client.post(URL, json=valid_payload).json()
    assert body["model"]["mode"] == "mock"
    assert body["model"]["is_demonstration"] is True
    assert body["disclaimer"].startswith("DEMONSTRATION ONLY")
    assert "not a medical diagnosis" in body["disclaimer"]


def test_mock_is_deterministic_and_input_dependent(client, valid_payload):
    a = client.post(URL, json=valid_payload).json()["prediction"]
    b = client.post(URL, json=valid_payload).json()["prediction"]
    assert a == b
    probs = {
        client.post(URL, json=dict(valid_payload, age=age)).json()["prediction"]["probability"]
        for age in range(20, 60, 5)
    }
    assert len(probs) > 1


def test_features_endpoint_describes_inputs_without_target(client):
    body = client.get("/api/v1/features").json()
    names = [f["name"] for f in body["features"]]
    assert names == list(FEATURE_ORDER)
    assert "diabetes" not in names
    assert body["provisional"] is True and body["notice"]
    assert len(body["features"]) == len(FEATURES)


def test_metrics_empty_state_when_none_supplied(client):
    body = client.get("/api/v1/metrics").json()
    assert body == {"available": False, "error": None, "metrics": None}


def test_metrics_all_null_template_counts_as_not_supplied(client, write_metrics):
    write_metrics({"confusion_matrix": {"tn": None, "fp": None, "fn": None, "tp": None}, "accuracy": None})
    assert client.get("/api/v1/metrics").json()["available"] is False


def test_metrics_served_exactly_as_supplied(client, write_metrics):
    supplied = {
        "confusion_matrix": {"tn": 50, "fp": 10, "fn": 5, "tp": 35},
        "accuracy": 0.85,
        "precision": 0.7778,
        "recall": 0.875,
        "f1": 0.8235,
    }
    write_metrics(supplied)
    body = client.get("/api/v1/metrics").json()
    assert body["available"] is True
    for k in ("accuracy", "precision", "recall", "f1"):
        assert body["metrics"][k] == supplied[k]
    assert body["metrics"]["confusion_matrix"] == supplied["confusion_matrix"]


def test_invalid_metrics_file_reports_error_not_data(client, write_metrics):
    write_metrics({"accuracy": 1.7, "confusion_matrix": {"tp": -3}})
    body = client.get("/api/v1/metrics").json()
    assert body["available"] is False
    assert "invalid" in body["error"]
    assert body["metrics"] is None


def test_unknown_api_route_is_404(client):
    assert client.get("/api/v1/nope").status_code == 404


def test_cors_allows_configured_origin_only(client):
    ok = client.options(
        URL,
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options(
        URL, headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"}
    )
    assert "access-control-allow-origin" not in bad.headers


def test_submitted_data_is_not_logged_or_written(client, valid_payload, caplog, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    caplog.set_level(logging.DEBUG)
    payload = dict(valid_payload, age=77, bmi=33.3)
    client.post(URL, json=payload)
    assert "33.3" not in caplog.text
    assert not [p for p in tmp_path.iterdir() if p.name not in ("metrics.json",)]
    json.dumps(payload)  # sanity: payload is serialisable


def test_no_database_or_storage_dependencies():
    import pathlib

    text = (pathlib.Path(__file__).parent.parent / "requirements.txt").read_text().lower()
    assert not any(db in text for db in ("sqlalchemy", "psycopg", "sqlite", "pymongo"))
