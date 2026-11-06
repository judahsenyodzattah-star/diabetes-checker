"""Backend input validation (independent of the frontend)."""

import copy

import pytest

from app.features import FEATURE_ORDER

URL = "/api/v1/predict"


def fields_of(resp):
    return {f["field"]: f["message"] for f in resp.json()["error"]["fields"]}


def test_valid_payload_accepted(client, valid_payload):
    assert client.post(URL, json=valid_payload).status_code == 200


@pytest.mark.parametrize("name", list(FEATURE_ORDER))
def test_each_field_is_required(client, valid_payload, name):
    del valid_payload[name]
    r = client.post(URL, json=valid_payload)
    assert r.status_code == 422
    assert fields_of(r)[name] == "This field is required."


def test_diabetes_is_never_an_input(client, valid_payload):
    valid_payload["diabetes"] = 1
    r = client.post(URL, json=valid_payload)
    assert r.status_code == 422
    assert "diabetes" in fields_of(r)


@pytest.mark.parametrize(
    "name,value",
    [
        ("age", -1),
        ("age", 121),
        ("age", 40.5),
        ("age", "40"),
        ("bmi", 0),
        ("bmi", 500),
        ("blood_pressure", -5),
        ("cholesterol", 10_000),
        ("physical_activity", 11),
        ("stress_level", -1),
        ("sex", "other"),
        ("smoker", "yes"),
        ("smoker", 1),
        ("heart_disease", None),
        ("bmi", "25"),
        ("bmi", True),
    ],
)
def test_bad_values_rejected(client, valid_payload, name, value):
    valid_payload[name] = value
    r = client.post(URL, json=valid_payload)
    assert r.status_code == 422
    assert name in fields_of(r)
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_nan_and_infinity_rejected(client, valid_payload):
    for token in ("NaN", "Infinity"):
        body = '{"age":45,"sex":"male","blood_pressure":%s,"cholesterol":200,"bmi":25,' % token
        body += '"smoker":false,"physical_activity":1,"family_history":false,"stress_level":1,"heart_disease":false}'
        r = client.post(URL, content=body, headers={"Content-Type": "application/json"})
        assert r.status_code == 422


def test_malformed_json_gives_structured_error(client):
    r = client.post(URL, content="{not json", headers={"Content-Type": "application/json"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_error_responses_never_echo_submitted_values(client, valid_payload):
    secret = "SENSITIVE-PATIENT-VALUE-12345"
    bad = copy.deepcopy(valid_payload)
    bad["age"] = secret
    bad["sex"] = secret
    bad["extra_field"] = secret
    r = client.post(URL, json=bad)
    assert r.status_code == 422
    assert secret not in r.text


def test_boundary_values_are_accepted(client, valid_payload):
    from app.features import FEATURES

    for f in FEATURES:
        if "min" in f:
            for edge in (f["min"], f["max"]):
                p = dict(valid_payload, **{f["name"]: edge})
                assert client.post(URL, json=p).status_code == 200, (f["name"], edge)
