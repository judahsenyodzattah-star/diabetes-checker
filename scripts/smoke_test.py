"""End-to-end smoke test against a RUNNING server (stdlib only).

    python scripts/smoke_test.py http://127.0.0.1:8000 mock
    python scripts/smoke_test.py http://127.0.0.1:8000 real-missing   # real mode, no model file

Exits non-zero on the first failed check.
"""

import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
MODE = sys.argv[2] if len(sys.argv) > 2 else "mock"

VALID = {
    "age": 45, "sex": "female", "blood_pressure": 120, "cholesterol": 200, "bmi": 27.5,
    "smoker": False, "physical_activity": 4, "family_history": True, "stress_level": 6,
    "heart_disease": False,
}


def call(method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            payload = r.read()
            return r.status, (payload.decode() if raw else json.loads(payload))
    except urllib.error.HTTPError as e:
        payload = e.read()
        return e.code, (payload.decode() if raw else json.loads(payload))


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        sys.exit(1)


s, health = call("GET", "/api/health")
check("health is ok", s == 200 and health["status"] == "ok")
s, feats = call("GET", "/api/v1/features")
check("features lists 10 inputs, no diabetes", s == 200 and len(feats["features"]) == 10 and all(f["name"] != "diabetes" for f in feats["features"]))
s, bad = call("POST", "/api/v1/predict", {**VALID, "age": -5, "diabetes": 1})
check("invalid request -> 422 with field errors", s == 422 and {f["field"] for f in bad["error"]["fields"]} == {"age", "diabetes"})

if MODE == "mock":
    check("health reports mock/demonstration", health["model"]["mode"] == "mock" and health["model"]["is_demonstration"])
    s, a = call("POST", "/api/v1/predict", VALID)
    s2, b = call("POST", "/api/v1/predict", VALID)
    check("valid prediction -> 200", s == 200 and a["prediction"]["label"] in ("diabetes", "no_diabetes"))
    check("response labelled demonstration", a["model"]["is_demonstration"] and a["disclaimer"].startswith("DEMONSTRATION ONLY"))
    check("mock is deterministic", a["prediction"] == b["prediction"])
    s, m = call("GET", "/api/v1/metrics")
    check("metrics empty state when none supplied", s == 200 and m["available"] is False)
    s, html = call("GET", "/predict", raw=True)
    if s == 200 and "<div id=\"root\">" in html:
        check("SPA route /predict served by backend", True)
        s, _ = call("GET", "/api/v1/does-not-exist")
        check("unknown API route is 404 JSON, not the SPA", s == 404)
    else:
        print("SKIP frontend serving (FRONTEND_DIST not set)")
elif MODE == "real-missing":
    check("health reports real mode, not loaded", health["model"]["mode"] == "real" and health["model"]["loaded"] is False)
    s, err = call("POST", "/api/v1/predict", VALID)
    check("prediction -> explicit 503, no mock fallback", s == 503 and err["error"]["code"] == "MODEL_UNAVAILABLE")
print("ALL CHECKS PASSED")
