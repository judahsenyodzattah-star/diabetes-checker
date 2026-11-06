from __future__ import annotations

from ..config import Settings
from .base import ModelAdapter, ModelUnavailableError, PredictionError, RawPrediction
from .mock import MockAdapter


def build_adapter(settings: Settings) -> ModelAdapter:
    """Choose the adapter from configuration. Never falls back between modes."""
    if settings.model_mode == "real":
        from .sklearn_adapter import SklearnAdapter

        return SklearnAdapter(settings.model_path, settings.positive_class)
    return MockAdapter()


__all__ = [
    "ModelAdapter",
    "ModelUnavailableError",
    "PredictionError",
    "RawPrediction",
    "MockAdapter",
    "build_adapter",
]
