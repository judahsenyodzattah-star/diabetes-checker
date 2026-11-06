"""Adapter interface. The API only talks to this; it never knows which model runs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from ..schemas import ModelInfo, ModelStatus


class ModelUnavailableError(RuntimeError):
    """The configured model could not be loaded. Surfaced to clients as HTTP 503."""


class PredictionError(RuntimeError):
    """The model loaded but failed on this input. Surfaced as HTTP 500 (no input echoed)."""


@dataclass(frozen=True)
class RawPrediction:
    predicted_positive: bool
    positive_probability: float | None


class ModelAdapter(ABC):
    @abstractmethod
    def status(self) -> ModelStatus: ...

    @abstractmethod
    def info(self) -> ModelInfo:
        """Raises ModelUnavailableError if the model is not usable."""

    @abstractmethod
    def predict(self, features: dict[str, Any]) -> RawPrediction:
        """`features` holds validated inputs keyed by FEATURE_ORDER names."""
