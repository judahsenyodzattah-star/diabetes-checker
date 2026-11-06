"""FastAPI application factory.

Privacy: submitted inputs are used only to compute the response. They are not
written to disk or a database, and are never logged or echoed in error bodies.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .adapters import ModelAdapter, ModelUnavailableError, PredictionError, build_adapter
from .config import Settings
from .features import FEATURE_ORDER, FEATURES
from .metrics import load_metrics
from .schemas import (
    ErrorResponse,
    FeaturesResponse,
    HealthResponse,
    MetricsResponse,
    PredictionRequest,
    PredictionResponse,
    Prediction,
)

log = logging.getLogger("diabetes_api")

DISCLAIMER = (
    "This is an educational machine-learning estimate. It is not a medical diagnosis and "
    "not a substitute for advice from a qualified health professional."
)
DEMO_DISCLAIMER = (
    "DEMONSTRATION ONLY: this response comes from a mock adapter with deterministic sample "
    "values. No trained model produced it and it says nothing about real health. " + DISCLAIMER
)

FEATURES_NOTICE = (
    "Units, category values and input limits are provisional: they have not yet been checked "
    "against the project's dataset or data dictionary."
)


def _error(status: int, code: str, message: str, fields: list[dict] | None = None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "fields": fields or []}}
    return JSONResponse(status_code=status, content=body, headers={"Cache-Control": "no-store"})


def _friendly(err: dict) -> str:
    kind = err.get("type", "")
    ctx = err.get("ctx") or {}
    if kind == "missing":
        return "This field is required."
    if kind == "extra_forbidden":
        return "Unknown field. Only the documented input fields are accepted."
    if kind in ("greater_than_equal", "less_than_equal"):
        bound = ctx.get("ge", ctx.get("le"))
        shown = f"{bound:g}" if isinstance(bound, (int, float)) else bound
        return f"Must be {'at least' if kind == 'greater_than_equal' else 'at most'} {shown}."
    if kind in ("int_type", "float_type", "bool_type"):
        wanted = {"int_type": "a whole number", "float_type": "a number", "bool_type": "true or false"}[kind]
        return f"Must be {wanted} (not text)."
    if kind == "literal_error":
        return f"Must be one of: {ctx.get('expected', 'the allowed values')}."
    return "Invalid value."


def create_app(settings: Settings | None = None, adapter: ModelAdapter | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    adapter = adapter or build_adapter(settings)

    app = FastAPI(
        title="Diabetes Prediction API",
        version=__version__,
        description=(
            "Educational diabetes-classification API. Responses from the mock adapter are "
            "demonstrations only. See docs/API.md."
        ),
    )
    app.state.settings = settings
    app.state.adapter = adapter

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    # ---- error handling (never include submitted values) -----------------
    @app.exception_handler(RequestValidationError)
    async def on_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(p) for p in e["loc"] if p != "body") or "body",
                "message": _friendly(e),
            }
            for e in exc.errors()
        ]
        return _error(422, "VALIDATION_ERROR", "Some inputs are missing or invalid.", fields)

    @app.exception_handler(ModelUnavailableError)
    async def on_unavailable(_: Request, exc: ModelUnavailableError) -> JSONResponse:
        return _error(503, "MODEL_UNAVAILABLE", str(exc))

    @app.exception_handler(PredictionError)
    async def on_prediction_error(_: Request, exc: PredictionError) -> JSONResponse:
        return _error(500, "PREDICTION_FAILED", str(exc))

    @app.exception_handler(Exception)
    async def on_unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.error("Unhandled error: %s", type(exc).__name__)
        return _error(500, "INTERNAL_ERROR", "Something went wrong on the server.")

    # ---- routes ----------------------------------------------------------
    @app.get("/api/health", response_model=HealthResponse, tags=["meta"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok", api_version=__version__, model=adapter.status())

    v1 = APIRouter(prefix="/api/v1")

    @v1.get("/features", response_model=FeaturesResponse, tags=["meta"])
    def features() -> FeaturesResponse:
        provisional = any(f.get("provisional") for f in FEATURES)
        return FeaturesResponse(
            provisional=provisional,
            notice=FEATURES_NOTICE if provisional else None,
            features=FEATURES,
        )

    @v1.get("/model", tags=["meta"])
    def model_status():
        return adapter.status()

    @v1.get("/metrics", response_model=MetricsResponse, tags=["meta"])
    def metrics(response: Response) -> MetricsResponse:
        response.headers["Cache-Control"] = "no-store"
        return load_metrics(settings.metrics_path)

    @v1.post(
        "/predict",
        response_model=PredictionResponse,
        responses={
            422: {"model": ErrorResponse},
            500: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
        tags=["prediction"],
    )
    def predict(payload: PredictionRequest, response: Response) -> PredictionResponse:
        response.headers["Cache-Control"] = "no-store"
        info = adapter.info()  # raises ModelUnavailableError in real mode if not loaded
        values = {name: getattr(payload, name) for name in FEATURE_ORDER}
        raw = adapter.predict(values)
        return PredictionResponse(
            request_id=str(uuid.uuid4()),
            prediction=Prediction(
                label="diabetes" if raw.predicted_positive else "no_diabetes",
                positive_class=raw.predicted_positive,
                probability=raw.positive_probability,
            ),
            model=info,
            disclaimer=DEMO_DISCLAIMER if info.is_demonstration else DISCLAIMER,
        )

    app.include_router(v1)

    # ---- optional: serve the built frontend from the same process --------
    dist: Path | None = settings.frontend_dist
    if dist and (dist / "index.html").is_file():
        if (dist / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            if path.startswith("api/"):
                return _error(404, "NOT_FOUND", "No such API route.")
            candidate = (dist / path).resolve()
            if path and candidate.is_file() and dist.resolve() in candidate.parents:
                return FileResponse(candidate)
            return FileResponse(dist / "index.html")

    return app


def get_app() -> FastAPI:
    """Entry point for uvicorn: `uvicorn app.main:app` (module-level `app` below)."""
    return create_app()


app = get_app()
