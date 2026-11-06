"""Runtime configuration, read from environment variables.

MODEL_MODE       "mock" (default) or "real"
MODEL_PATH       path to the saved scikit-learn pipeline (joblib), real mode only
POSITIVE_CLASS   value of `classes_` that means "diabetes" (default "1")
METRICS_PATH     path to the evaluation metrics JSON supplied by the project author
CORS_ORIGINS     comma-separated list of allowed browser origins
FRONTEND_DIST    optional path to a built frontend to serve from this process
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent

VALID_MODES = ("mock", "real")


class ConfigError(ValueError):
    """Raised when configuration is invalid (e.g. unknown MODEL_MODE)."""


def _path(value: str | None, default: Path) -> Path:
    if not value:
        return default
    p = Path(value).expanduser()
    return p if p.is_absolute() else (BACKEND_DIR / p)


@dataclass(frozen=True)
class Settings:
    model_mode: str = "mock"
    model_path: Path = BACKEND_DIR / "model_artifacts" / "model.joblib"
    positive_class: str = "1"
    metrics_path: Path = BACKEND_DIR / "model_artifacts" / "metrics.json"
    cors_origins: tuple[str, ...] = field(
        default=("http://localhost:5173", "http://127.0.0.1:5173")
    )
    frontend_dist: Path | None = None

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        e = os.environ if env is None else env
        mode = (e.get("MODEL_MODE") or "mock").strip().lower()
        if mode not in VALID_MODES:
            raise ConfigError(
                f"MODEL_MODE must be one of {VALID_MODES}, got {mode!r}. "
                "Refusing to start rather than guess."
            )
        origins = tuple(
            o.strip()
            for o in (e.get("CORS_ORIGINS") or ",".join(cls.cors_origins)).split(",")
            if o.strip()
        )
        dist = e.get("FRONTEND_DIST")
        return cls(
            model_mode=mode,
            model_path=_path(e.get("MODEL_PATH"), cls.model_path),
            positive_class=(e.get("POSITIVE_CLASS") or "1").strip(),
            metrics_path=_path(e.get("METRICS_PATH"), cls.metrics_path),
            cors_origins=origins,
            frontend_dist=_path(dist, REPO_DIR / "frontend" / "dist") if dist else None,
        )
