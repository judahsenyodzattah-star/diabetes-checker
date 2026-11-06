"""Loads evaluation metrics supplied by the project author. Never computes or invents any."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from .schemas import MetricsFile, MetricsResponse


def _has_content(m: MetricsFile) -> bool:
    cm = m.confusion_matrix
    return any(
        v is not None for v in (cm.tn, cm.fp, cm.fn, cm.tp, m.accuracy, m.precision, m.recall, m.f1)
    )


def load_metrics(path: Path) -> MetricsResponse:
    if not path.is_file():
        return MetricsResponse(available=False)
    try:
        metrics = MetricsFile.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError, ValidationError) as exc:
        # Explicit error: a malformed file must not be shown as if it were real.
        problems = (
            "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
            if isinstance(exc, ValidationError)
            else str(exc)
        )
        return MetricsResponse(available=False, error=f"metrics file is invalid ({problems})")
    if not _has_content(metrics):
        return MetricsResponse(available=False)
    return MetricsResponse(available=True, metrics=metrics)
