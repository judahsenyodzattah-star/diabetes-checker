"""Write the API's OpenAPI schema to docs/openapi.json (run from the repo root)."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

schema = create_app(Settings()).openapi()
(ROOT / "docs" / "openapi.json").write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
print("wrote docs/openapi.json")
