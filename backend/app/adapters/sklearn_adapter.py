"""Adapter for a saved scikit-learn preprocessing-and-model pipeline (joblib).

Contract expected of the saved object (see docs/MODEL_INTEGRATION.md):
  * a single fitted estimator/Pipeline that does ALL preprocessing itself
    (encoding, scaling, imputation) and accepts a one-row pandas DataFrame
    whose columns are exactly FEATURE_ORDER;
  * `predict(X)`; optionally `predict_proba(X)` and `classes_`.

Only load model files you created yourself: joblib/pickle can execute code.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from ..features import FEATURE_ORDER
from ..schemas import ModelInfo, ModelStatus
from .base import ModelAdapter, ModelUnavailableError, PredictionError, RawPrediction

log = logging.getLogger("diabetes_api.model")


def build_model_row(features: dict[str, Any]) -> dict[str, Any]:
    """Translate validated API values into the values the pipeline was TRAINED on.

    >>> EDIT THIS if your training data encoded a column differently. <<<
    Defaults: numbers pass through, `sex` stays "female"/"male", and yes/no
    fields become 1/0. If the training data used e.g. "Yes"/"No" strings or
    different sex labels, convert them here, so the API contract never changes.
    """
    row: dict[str, Any] = {}
    for name in FEATURE_ORDER:
        value = features[name]
        row[name] = int(value) if isinstance(value, bool) else value
    return row


class SklearnAdapter(ModelAdapter):
    def __init__(self, model_path: Path, positive_class: str = "1", model: Any | None = None):
        self._path = Path(model_path)
        self._positive = str(positive_class)
        self._model: Any | None = model
        self._error: str | None = None
        if model is None:
            self.load()

    # -- loading -----------------------------------------------------------
    def load(self) -> None:
        if self._model is not None:
            return
        try:
            if not self._path.is_file():
                raise FileNotFoundError(f"Model file not found at {self._path}")
            import joblib  # lazy: mock mode must not need scikit-learn installed

            self._model = joblib.load(self._path)
            if not hasattr(self._model, "predict"):
                self._model = None
                raise TypeError("Loaded object has no predict() method; expected a fitted pipeline")
            self._error = None
            log.info("Loaded model from %s", self._path)
        except Exception as exc:  # explicit, never falls back to mock
            self._model = None
            self._error = f"{type(exc).__name__}: {exc}"
            log.error("Could not load model: %s", self._error)

    def _require(self) -> Any:
        if self._model is None:
            self.load()  # allow dropping the file in without restarting
        if self._model is None:
            raise ModelUnavailableError(
                "MODEL_MODE is 'real' but the model could not be loaded "
                f"({self._error}). Predictions are disabled; the mock model is NOT used as a fallback."
            )
        return self._model

    # -- adapter API -------------------------------------------------------
    def status(self) -> ModelStatus:
        loaded = self._model is not None
        return ModelStatus(
            mode="real",
            loaded=loaded,
            is_demonstration=False,
            name=type(self._model).__name__ if loaded else None,
            version=None,
            error=None if loaded else self._error,
        )

    def info(self) -> ModelInfo:
        model = self._require()
        return ModelInfo(mode="real", name=type(model).__name__, version=None, is_demonstration=False)

    def predict(self, features: dict[str, Any]) -> RawPrediction:
        model = self._require()
        try:
            import pandas as pd

            frame = pd.DataFrame([build_model_row(features)], columns=list(FEATURE_ORDER))
            predicted = model.predict(frame)[0]
            probability: float | None = None
            classes = [str(c) for c in getattr(model, "classes_", [])]
            if hasattr(model, "predict_proba"):
                if self._positive not in classes:
                    raise PredictionError(
                        f"POSITIVE_CLASS={self._positive!r} is not in model.classes_={classes}"
                    )
                probability = float(model.predict_proba(frame)[0][classes.index(self._positive)])
            return RawPrediction(
                predicted_positive=str(predicted) == self._positive,
                positive_probability=probability,
            )
        except PredictionError:
            raise
        except Exception as exc:
            # Log the error type only: messages may contain input values.
            log.error("Prediction failed: %s", type(exc).__name__)
            raise PredictionError("The model failed to produce a prediction for this input.") from exc
