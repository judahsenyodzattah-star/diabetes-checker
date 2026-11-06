import json

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

VALID = {
    "age": 45,
    "sex": "female",
    "blood_pressure": 120,
    "cholesterol": 200,
    "bmi": 27.5,
    "smoker": False,
    "physical_activity": 4,
    "family_history": True,
    "stress_level": 6,
    "heart_disease": False,
}


@pytest.fixture
def valid_payload():
    return dict(VALID)


@pytest.fixture
def make_client(tmp_path):
    def _make(**overrides):
        defaults = dict(metrics_path=tmp_path / "metrics.json", model_path=tmp_path / "model.joblib")
        defaults.update(overrides)
        return TestClient(create_app(Settings(**defaults)))

    return _make


@pytest.fixture
def client(make_client):
    return make_client()


@pytest.fixture
def write_metrics(tmp_path):
    def _write(data):
        (tmp_path / "metrics.json").write_text(json.dumps(data))

    return _write
