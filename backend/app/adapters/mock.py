"""Mock adapter: deterministic DEMONSTRATION responses. Not a model.

The probability is derived from a hash of the inputs, so identical inputs always
give identical output and different inputs give varied output. It has NO
relationship to health or to any real data. It exists only so the web app and
API contract can be built and tested before the real model is supplied.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from ..schemas import ModelInfo, ModelStatus
from .base import ModelAdapter, RawPrediction

MOCK_NAME = "Mock demonstration adapter (not a trained model)"


class MockAdapter(ModelAdapter):
    def status(self) -> ModelStatus:
        return ModelStatus(mode="mock", loaded=True, is_demonstration=True, name=MOCK_NAME, version="mock")

    def info(self) -> ModelInfo:
        return ModelInfo(mode="mock", name=MOCK_NAME, version="mock", is_demonstration=True)

    def predict(self, features: dict[str, Any]) -> RawPrediction:
        canonical = json.dumps(features, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(canonical.encode()).digest()
        # Map the first 4 bytes to [0.05, 0.95], rounded for stable output.
        fraction = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF
        probability = round(0.05 + 0.90 * fraction, 4)
        return RawPrediction(predicted_positive=probability >= 0.5, positive_probability=probability)
