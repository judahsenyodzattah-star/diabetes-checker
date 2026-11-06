# Integrating your trained model

The web app never needs to change when you plug in your model. Only the files below do.

## 0. First: confirm the input definitions against your data

No dataset or data dictionary was available when this app was built, so the definitions in
[`backend/app/features.py`](../backend/app/features.py) are **provisional**. Before connecting the
model, open your dataset / data dictionary and check each item:

| Check | Where to change it |
|---|---|
| Exact column names & order used when training | `FEATURE_ORDER` and `FEATURES` in `features.py` |
| Units: blood pressure (systolic? diastolic? mean?), cholesterol (mg/dL or mmol/L?) | `unit` and `help` text |
| Observed min/max per numeric column (replace the placeholder sanity bounds) | `min` / `max` |
| What the physical-activity and stress scores are (scale, direction, integer or not) | `min`, `max`, `step`, `help` — the app deliberately doesn't say what high/low means |
| Category values for `sex` (and whether there are more than two) | `options` and the `Literal[...]` in `schemas.py` |
| What "smoker" means (current / ever) and the other yes/no definitions | `help` |
| **Is `heart_disease` an appropriate input?** | see below |
| Set `"provisional": False` once confirmed | removes the notice on the form |

**`heart_disease` as an input.** It could not be confirmed without the data. It is a plausible
risk-related attribute, so it is included, but check that: (1) it is recorded independently of the
diabetes label (not a consequence or proxy of it, which would be target leakage or circular);
(2) a user could realistically supply it at prediction time; (3) it is not nearly constant or
missing for most rows. If any check fails, remove it from `FEATURE_ORDER`, `FEATURES` and
`PredictionRequest` and from the pipeline's training columns. The form is generated from
`/api/v1/features` so it follows automatically (also update `GROUPS` in `frontend/src/pages/Predict.tsx`
if you rename or remove fields, and the tests' fixtures).

`diabetes` is the prediction target and is rejected if sent as an input.

If you change a field name or type, also update `PredictionRequest` in `backend/app/schemas.py`
and `docs/API.md`, then run `python scripts/export_openapi.py`.

## 1. Save your pipeline

In your training notebook, save **one** fitted object that includes all preprocessing:

```python
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# pipeline = Pipeline([("prep", ColumnTransformer([...])), ("clf", YourClassifier())])
# pipeline.fit(X_train, y_train)          # X_train: DataFrame with columns in FEATURE_ORDER
joblib.dump(pipeline, "model.joblib")
```

Requirements:

* Input is a one-row `pandas.DataFrame` with columns `age, sex, blood_pressure, cholesterol, bmi,
  smoker, physical_activity, family_history, stress_level, heart_disease` (the names must match
  training; use `ColumnTransformer` with column *names*, not positions).
* It exposes `predict(X)`; ideally also `predict_proba(X)` and `classes_` (needed for probability).
* Use the **same scikit-learn / pandas / numpy versions** in the backend as in training, or pickle loading may
  fail or silently behave differently. Pin them in `backend/requirements-model.txt`.
* Only load files you created yourself — joblib/pickle files can execute arbitrary code.

## 2. Place the file and configure

```bash
cp model.joblib backend/model_artifacts/model.joblib      # git-ignored on purpose
cd backend
pip install -r requirements-model.txt                      # scikit-learn, pandas, joblib, numpy (pin versions!)
MODEL_MODE=real POSITIVE_CLASS=1 python -m uvicorn app.main:app --port 8000
```

| variable | meaning |
|---|---|
| `MODEL_MODE` | `mock` (default) or `real` |
| `MODEL_PATH` | default `backend/model_artifacts/model.joblib` (relative paths are relative to `backend/`) |
| `POSITIVE_CLASS` | the value in `classes_` that means *diabetes* (default `"1"`; compared as text, so `1`, `"1"` and `True`-as-`"True"` all work if set accordingly) |

Check it: `curl localhost:8000/api/health` should show `"mode":"real","loaded":true`. If it can't load,
`loaded` is `false` with an `error`, the site shows a red banner, and `POST /api/v1/predict` returns
**503 `MODEL_UNAVAILABLE`**. The mock is never used as a fallback in real mode.

## 3. Match the encodings (if needed)

The API sends booleans as `1`/`0` and `sex` as `"female"`/`"male"`. If your training data used something
else (e.g. `"Yes"`/`"No"`, `"F"`/`"M"`), edit **`build_model_row()`** in
[`backend/app/adapters/sklearn_adapter.py`](../backend/app/adapters/sklearn_adapter.py). It is the only
place that translates API values into training values.

If your classifier has no `predict_proba`, the API returns `"probability": null` and the UI says that
no probability is available.

## 4. Supply your real evaluation metrics

Evaluate on your **held-out test set** in the notebook, then:

```bash
cp backend/model_artifacts/metrics.example.json backend/model_artifacts/metrics.json
# edit the numbers; null = "not supplied"
```

```json
{
  "model_name": "…",
  "evaluated_on": "held-out test set, n = …",
  "notes": "optional free text",
  "confusion_matrix": { "tn": 0, "fp": 0, "fn": 0, "tp": 0 },
  "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0
}
```

Layout matches scikit-learn's `confusion_matrix(y_true, y_pred).ravel()` → `tn, fp, fn, tp`
with class `1` = diabetes. Scores are fractions between 0 and 1. The app displays exactly what you give it and
never computes or fills in missing values; an invalid file is reported as an error, not shown. (Metrics are
not patient data, so you may commit `metrics.json`; the `.joblib` model is git-ignored by default.)
Reload the Model performance page — no restart needed.

## 5. Update the text

Fill in the "dataset" section of `frontend/src/pages/About.tsx` (name, source, licence, size, variable
definitions) and adjust "Model approach" to say which algorithm you used.

## 6. Tests

`cd backend && python -m pytest` includes tests that load a stub pickled pipeline in real mode. After
adding your model, run one real prediction through `/docs` or `curl` to confirm column names and encodings.
