# Prediction API contract (v1)

This contract is stable and framework-neutral: the React web app uses it today, and a
future Expo / React Native app can call the same endpoints (plain JSON over HTTPS, no
cookies, no sessions). Interactive docs: `http://localhost:8000/docs`; a machine-readable
copy is committed at [`docs/openapi.json`](openapi.json) (regenerate with
`python scripts/export_openapi.py`).

> **Status of the input definitions.** No dataset or data dictionary had been supplied when
> the API was built. Units, category values and numeric limits are **provisional**
> (`provisional: true` in `GET /api/v1/features`). The numeric limits are loose data-entry
> sanity bounds, not medical thresholds. Replace them from the data dictionary in
> `backend/app/features.py`.

Base URL (local): `http://localhost:8000`

## `POST /api/v1/predict`

Request (`Content-Type: application/json`). **All fields required. No other fields are accepted
— in particular `diabetes` is the prediction target and is rejected as an input.**

| field | type | provisional constraint | notes |
|---|---|---|---|
| `age` | integer | 0 – 120 | years |
| `sex` | string | `"female"` \| `"male"` | must match the dataset's encoding |
| `blood_pressure` | number | 30 – 300 | one value; measure & unit to be confirmed |
| `cholesterol` | number | 50 – 600 | one value; measure & unit to be confirmed |
| `bmi` | number | 10 – 80 | kg/m² |
| `smoker` | boolean | | JSON `true`/`false` only |
| `physical_activity` | number | 0 – 10 | score as defined in the dataset; meaning not interpreted |
| `family_history` | boolean | | |
| `stress_level` | number | 0 – 10 | score as defined in the dataset; meaning not interpreted |
| `heart_disease` | boolean | | appropriateness as an input still to be confirmed |

Types are strict: `"42"`, `"yes"`, `1` for a boolean, `NaN` and `Infinity` are rejected rather than coerced.

```bash
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45, "sex": "female", "blood_pressure": 120, "cholesterol": 200,
    "bmi": 27.5, "smoker": false, "physical_activity": 4,
    "family_history": true, "stress_level": 6, "heart_disease": false
  }'
```

### 200 response

```json
{
  "request_id": "6f3c6a5e-0f55-4c4e-9d0e-2b3f0a4f7a11",
  "prediction": {
    "label": "diabetes",
    "positive_class": true,
    "probability": 0.6454
  },
  "model": {
    "mode": "mock",
    "name": "Mock demonstration adapter (not a trained model)",
    "version": "mock",
    "is_demonstration": true
  },
  "disclaimer": "DEMONSTRATION ONLY: ... This is an educational machine-learning estimate. It is not a medical diagnosis ..."
}
```

* `prediction.label` — `"diabetes"` or `"no_diabetes"`.
* `prediction.probability` — the model's estimated probability of the `diabetes` class (0–1), or
  `null` when the saved model has no `predict_proba`. Clients must handle `null`.
* `model.is_demonstration` — `true` for every mock response. Clients **must** show this to users.
* `request_id` — random per request, for correlating bug reports. Nothing about the request is stored.

### Errors

All errors share one shape and **never echo submitted values**:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some inputs are missing or invalid.",
             "fields": [ { "field": "age", "message": "Must be at most 120." } ] } }
```

| HTTP | `code` | meaning |
|---|---|---|
| 422 | `VALIDATION_ERROR` | missing/invalid/unknown fields; see `fields` |
| 503 | `MODEL_UNAVAILABLE` | `MODEL_MODE=real` but the model could not be loaded. **No mock fallback.** |
| 500 | `PREDICTION_FAILED` | model loaded but failed on this input / misconfigured positive class |
| 500 | `INTERNAL_ERROR` | unexpected server error |

## Other endpoints

| endpoint | purpose |
|---|---|
| `GET /api/health` | `{status, api_version, model:{mode, loaded, is_demonstration, error}}` |
| `GET /api/v1/features` | The input definitions (labels, units, limits, options, help text, `provisional`). The web form is generated from this, so clients stay in sync with the backend. |
| `GET /api/v1/model` | Current model status (same object as `health.model`) |
| `GET /api/v1/metrics` | `{available, error, metrics}`; evaluation scores exactly as supplied in `backend/model_artifacts/metrics.json`, or `available:false` (never invented values) |

## Using it from Expo later

* Call `fetch(`${API_BASE_URL}/api/v1/predict`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body })`.
* Fetch `/api/v1/features` at startup to build the form instead of hard-coding limits.
* Add the app's origin to `CORS_ORIGINS` only if it runs in a browser (Expo web); native apps are not subject to CORS.
* Use HTTPS when you eventually deploy; do not send real patient data to a development server.
