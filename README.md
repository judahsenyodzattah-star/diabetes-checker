# Diabetes Prediction Project (hospital-classification)

A university project: a React + TypeScript + Vite web app and a Python FastAPI backend that will serve a
scikit-learn diabetes classifier. **The trained model is not included yet**; the backend currently runs a clearly
labelled **mock adapter** with deterministic sample responses. No evaluation scores are shown until you supply real ones.

> Educational only. Not a medical device; it provides no diagnosis or treatment advice.

```
backend/    FastAPI app, adapters (mock + scikit-learn), tests
frontend/   Vite + React + TypeScript web app, tests
docs/       API.md (contract), openapi.json, MODEL_INTEGRATION.md
scripts/    smoke_test.py (end-to-end), export_openapi.py
src/, package.json, ...   Next.js starter kept only as the hosting-platform preview shell (see below)
```

## Pages

Home · Prediction form · Results · Model performance (confusion matrix + accuracy/precision/recall/F1, with an empty state
until you supply them) · About (dataset, approach, limitations, purpose).

## Quick start

Requires Python 3.10+ and Node 20+.

```bash
# 1. Backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --port 8000      # API docs: http://localhost:8000/docs

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                                              # http://localhost:5173 (proxies /api to :8000)
```

**Single-process alternative:** `cd frontend && npm run build`, then
`cd backend && FRONTEND_DIST=../frontend/dist python -m uvicorn app.main:app --port 8000` and open http://localhost:8000.

If the API is on a different origin, set `VITE_API_BASE_URL` for the frontend build and add the frontend's origin to
`CORS_ORIGINS` on the backend (see `backend/.env.example`).

## Example request

```bash
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"age":45,"sex":"female","blood_pressure":120,"cholesterol":200,"bmi":27.5,
       "smoker":false,"physical_activity":4,"family_history":true,"stress_level":6,"heart_disease":false}'
```

Response (mock mode; note `is_demonstration`):

```json
{
  "request_id": "…",
  "prediction": { "label": "diabetes", "positive_class": true, "probability": 0.6454 },
  "model": { "mode": "mock", "name": "Mock demonstration adapter (not a trained model)", "version": "mock", "is_demonstration": true },
  "disclaimer": "DEMONSTRATION ONLY: … It is not a medical diagnosis …"
}
```

Full contract, error format and Expo notes: [docs/API.md](docs/API.md).

## Model modes

| `MODEL_MODE` | behaviour |
|---|---|
| `mock` (default) | deterministic sample predictions from a hash of the inputs; every response and the UI say "demonstration" |
| `real` | loads `backend/model_artifacts/model.joblib`; **if it can't load, predictions fail with HTTP 503 and a clear message. Never a silent mock.** |

Connect your model: **[docs/MODEL_INTEGRATION.md](docs/MODEL_INTEGRATION.md)**.

## Important: provisional input definitions

No dataset or data dictionary was supplied, so units, category values, numeric limits and whether `heart_disease` is a
suitable input could **not** be confirmed. Everything lives in `backend/app/features.py`, is marked `provisional`, and is
shown to users as unconfirmed. The numeric limits are loose data-entry sanity bounds, not medical thresholds. The meaning of
the physical-activity and stress scores is intentionally not interpreted. See the checklist in MODEL_INTEGRATION.md.

## Privacy

Submitted values are not stored, logged, or echoed in error responses (tested). There is no database. Responses are
`Cache-Control: no-store`. The frontend keeps the last result only in in-memory router state. `.gitignore` excludes `.env`, CSV/Excel/Parquet
data, trained model files and temp files; never commit raw patient records.

## Tests

```bash
cd backend  && python -m pytest                 # validation, API, real-mode behaviour, privacy (53 tests)
cd frontend && npm test && npm run build        # validation, form flow, results, metrics states (22 tests)
# end-to-end against a running server:
python scripts/smoke_test.py http://127.0.0.1:8000 mock
```

## Platform preview shell (Next.js files)

The repository began from a Next.js + PostgreSQL starter used by the hosting sandbox for its preview and health check. Those
files (`src/`, `package.json`, `next.config.ts`, …) are kept so that environment keeps working. The project itself does not use
Next.js or PostgreSQL; the app is `frontend/` + `backend/`. You can delete the shell files when running outside that platform.

## Not included (by design)

Model training, the mobile app, public deployment. The API is versioned (`/api/v1`) and documented so an Expo app can use it later.
