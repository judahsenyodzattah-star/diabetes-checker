"""Request / response models. These ARE the API contract (see docs/API.md)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .features import bounds

_AGE = bounds("age")
_BP = bounds("blood_pressure")
_CHOL = bounds("cholesterol")
_BMI = bounds("bmi")
_PA = bounds("physical_activity")
_STRESS = bounds("stress_level")


class PredictionRequest(BaseModel):
    """Model inputs. Unknown fields (including `diabetes`) are rejected.

    Types are strict: numbers must be JSON numbers and yes/no fields must be
    JSON booleans, so strings such as "yes" or "42" are never silently coerced.
    """

    model_config = ConfigDict(extra="forbid")

    age: int = Field(strict=True, ge=_AGE[0], le=_AGE[1], description="Age in whole years")
    sex: Literal["female", "male"]
    blood_pressure: float = Field(strict=True, allow_inf_nan=False, ge=_BP[0], le=_BP[1])
    cholesterol: float = Field(strict=True, allow_inf_nan=False, ge=_CHOL[0], le=_CHOL[1])
    bmi: float = Field(strict=True, allow_inf_nan=False, ge=_BMI[0], le=_BMI[1], description="kg/m²")
    smoker: bool = Field(strict=True)
    physical_activity: float = Field(strict=True, allow_inf_nan=False, ge=_PA[0], le=_PA[1])
    family_history: bool = Field(strict=True)
    stress_level: float = Field(strict=True, allow_inf_nan=False, ge=_STRESS[0], le=_STRESS[1])
    heart_disease: bool = Field(strict=True)


class ModelInfo(BaseModel):
    mode: Literal["mock", "real"]
    name: str
    version: str | None = None
    is_demonstration: bool = Field(
        description="True when the response comes from the mock adapter and is NOT a real model output."
    )


class Prediction(BaseModel):
    label: Literal["diabetes", "no_diabetes"] = Field(description="Predicted class")
    positive_class: bool = Field(description="True when the predicted class is 'diabetes'")
    probability: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Model's estimated probability of the 'diabetes' class, or null if the model cannot provide one",
    )


class PredictionResponse(BaseModel):
    request_id: str
    prediction: Prediction
    model: ModelInfo
    disclaimer: str


class ModelStatus(BaseModel):
    mode: Literal["mock", "real"]
    loaded: bool
    is_demonstration: bool
    name: str | None = None
    version: str | None = None
    error: str | None = Field(default=None, description="Why the model could not load (real mode)")


class HealthResponse(BaseModel):
    status: Literal["ok"]
    api_version: str
    model: ModelStatus


class FeaturesResponse(BaseModel):
    provisional: bool = Field(description="True while any feature definition is unconfirmed")
    notice: str | None
    features: list[dict[str, Any]]


class ConfusionMatrix(BaseModel):
    tn: int | None = Field(default=None, ge=0)
    fp: int | None = Field(default=None, ge=0)
    fn: int | None = Field(default=None, ge=0)
    tp: int | None = Field(default=None, ge=0)


Score = Field(default=None, ge=0, le=1)


class MetricsFile(BaseModel):
    """Shape of backend/model_artifacts/metrics.json (all fields optional, null = not supplied)."""

    model_config = ConfigDict(extra="ignore")

    model_name: str | None = None
    evaluated_on: str | None = Field(default=None, description="Free text, e.g. 'held-out test set, n=...'")
    notes: str | None = None
    confusion_matrix: ConfusionMatrix = Field(default_factory=ConfusionMatrix)
    accuracy: float | None = Score
    precision: float | None = Score
    recall: float | None = Score
    f1: float | None = Score


class MetricsResponse(BaseModel):
    available: bool
    error: str | None = None
    metrics: MetricsFile | None = None


class FieldError(BaseModel):
    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    fields: list[FieldError] = []


class ErrorResponse(BaseModel):
    error: ErrorBody
