"""Real-mode behaviour: explicit errors, never a silent mock fallback."""

import pytest

from app.config import ConfigError, Settings

URL = "/api/v1/predict"


def test_invalid_mode_refuses_to_start():
    with pytest.raises(ConfigError):
        Settings.from_env({"MODEL_MODE": "banana"})


def test_default_mode_is_mock():
    assert Settings.from_env({}).model_mode == "mock"


def test_real_mode_without_model_returns_explicit_503(make_client, valid_payload):
    client = make_client(model_mode="real")
    r = client.post(URL, json=valid_payload)
    assert r.status_code == 503
    err = r.json()["error"]
    assert err["code"] == "MODEL_UNAVAILABLE"
    assert "NOT used as a fallback" in err["message"]
    assert "probability" not in r.text  # no prediction payload of any kind


def test_real_mode_health_reports_unloaded_model(make_client):
    body = make_client(model_mode="real").get("/api/health").json()
    assert body["model"]["mode"] == "real"
    assert body["model"]["loaded"] is False
    assert body["model"]["error"]
    assert body["model"]["is_demonstration"] is False


def test_real_mode_corrupt_model_file_is_503(make_client, tmp_path, valid_payload):
    pytest.importorskip("joblib")
    (tmp_path / "model.joblib").write_bytes(b"this is not a pickle")
    r = make_client(model_mode="real").post(URL, json=valid_payload)
    assert r.status_code == 503


# ---- loading a real saved pipeline ------------------------------------------
class StubPipeline:
    """Stands in for a fitted sklearn Pipeline. Defined at module level so joblib can pickle it."""

    classes_ = [0, 1]

    def predict(self, X):
        assert list(X.columns) == [
            "age", "sex", "blood_pressure", "cholesterol", "bmi",
            "smoker", "physical_activity", "family_history", "stress_level", "heart_disease",
        ]
        return [1 if X.iloc[0]["age"] >= 50 else 0]

    def predict_proba(self, X):
        p = 0.9 if X.iloc[0]["age"] >= 50 else 0.2
        return [[1 - p, p]]


def test_real_mode_loads_saved_pipeline_and_labels_it_not_demo(make_client, tmp_path, valid_payload):
    joblib = pytest.importorskip("joblib")
    pytest.importorskip("pandas")
    joblib.dump(StubPipeline(), tmp_path / "model.joblib")
    client = make_client(model_mode="real")

    assert client.get("/api/health").json()["model"]["loaded"] is True
    old = client.post(URL, json=dict(valid_payload, age=60)).json()
    young = client.post(URL, json=dict(valid_payload, age=30)).json()

    assert old["model"]["is_demonstration"] is False and old["model"]["mode"] == "real"
    assert not old["disclaimer"].startswith("DEMONSTRATION")
    assert old["prediction"] == {"label": "diabetes", "positive_class": True, "probability": 0.9}
    assert young["prediction"]["label"] == "no_diabetes"
    assert young["prediction"]["probability"] == 0.2


def test_model_dropped_in_after_startup_is_picked_up(make_client, tmp_path, valid_payload):
    joblib = pytest.importorskip("joblib")
    pytest.importorskip("pandas")
    client = make_client(model_mode="real")
    assert client.post(URL, json=valid_payload).status_code == 503
    joblib.dump(StubPipeline(), tmp_path / "model.joblib")
    assert client.post(URL, json=valid_payload).status_code == 200


def test_wrong_positive_class_config_is_an_error_not_a_guess(make_client, tmp_path, valid_payload):
    joblib = pytest.importorskip("joblib")
    pytest.importorskip("pandas")
    joblib.dump(StubPipeline(), tmp_path / "model.joblib")
    r = make_client(model_mode="real", positive_class="yes").post(URL, json=valid_payload)
    assert r.status_code == 500
    assert r.json()["error"]["code"] == "PREDICTION_FAILED"
