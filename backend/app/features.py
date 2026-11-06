"""Single source of truth for the model's input features.

IMPORTANT: no dataset or data dictionary had been supplied when this file was
written, so every range / unit / category below is PROVISIONAL. The numeric
limits are generous *data-entry sanity bounds* used only to reject typos and
nonsense (e.g. a negative age). They are NOT medical thresholds and carry no
clinical meaning.

When the dataset is available, edit this file (and only this file) to match the
data dictionary, set `provisional` to False for confirmed features, and the
backend validation, the `/api/v1/features` endpoint and the web form all follow.

"diabetes" is the prediction target and must never appear as an input.
"""

from __future__ import annotations

from typing import Any

# Column order passed to the model pipeline. Must match training.
FEATURE_ORDER: tuple[str, ...] = (
    "age",
    "sex",
    "blood_pressure",
    "cholesterol",
    "bmi",
    "smoker",
    "physical_activity",
    "family_history",
    "stress_level",
    "heart_disease",
)

_YES_NO = [{"value": True, "label": "Yes"}, {"value": False, "label": "No"}]

FEATURES: list[dict[str, Any]] = [
    {
        "name": "age",
        "label": "Age",
        "type": "integer",
        "unit": "years",
        "min": 0,
        "max": 120,
        "step": 1,
        "help": "Age in whole years.",
        "provisional": True,
    },
    {
        "name": "sex",
        "label": "Sex",
        "type": "category",
        "options": [
            {"value": "female", "label": "Female"},
            {"value": "male", "label": "Male"},
        ],
        "help": "Category values are provisional; they must match the dataset's encoding.",
        "provisional": True,
    },
    {
        "name": "blood_pressure",
        "label": "Blood pressure",
        "type": "number",
        "unit": None,
        "min": 30,
        "max": 300,
        "step": 1,
        "help": (
            "A single numeric value. Which measurement it is (for example systolic, "
            "diastolic or mean) and its unit must be confirmed from the data dictionary."
        ),
        "provisional": True,
    },
    {
        "name": "cholesterol",
        "label": "Cholesterol",
        "type": "number",
        "unit": None,
        "min": 50,
        "max": 600,
        "step": 1,
        "help": (
            "A single numeric value. Which cholesterol measure it is and its unit "
            "(mg/dL or mmol/L) must be confirmed from the data dictionary."
        ),
        "provisional": True,
    },
    {
        "name": "bmi",
        "label": "Body mass index (BMI)",
        "type": "number",
        "unit": "kg/m²",
        "min": 10,
        "max": 80,
        "step": 0.1,
        "help": "Weight in kilograms divided by height in metres squared.",
        "provisional": True,
    },
    {
        "name": "smoker",
        "label": "Smoker",
        "type": "boolean",
        "options": _YES_NO,
        "help": "Whether 'smoker' means current or ever-smoked must be confirmed from the data dictionary.",
        "provisional": True,
    },
    {
        "name": "physical_activity",
        "label": "Physical activity score",
        "type": "number",
        "unit": "score",
        "min": 0,
        "max": 10,
        "step": 1,
        "help": (
            "A numeric score exactly as defined in the dataset. This app does not "
            "interpret what a low or high score means; the scale shown is a placeholder."
        ),
        "provisional": True,
    },
    {
        "name": "family_history",
        "label": "Family history of diabetes",
        "type": "boolean",
        "options": _YES_NO,
        "help": "Which relatives count must be confirmed from the data dictionary.",
        "provisional": True,
    },
    {
        "name": "stress_level",
        "label": "Stress level score",
        "type": "number",
        "unit": "score",
        "min": 0,
        "max": 10,
        "step": 1,
        "help": (
            "A numeric score exactly as defined in the dataset. This app does not "
            "interpret what a low or high score means; the scale shown is a placeholder."
        ),
        "provisional": True,
    },
    {
        "name": "heart_disease",
        "label": "Heart disease",
        "type": "boolean",
        "options": _YES_NO,
        "help": "Whether the person has a recorded history of heart disease.",
        "provisional": True,
        "review_note": (
            "Unconfirmed as an input: no dataset was available to check it. Before keeping it, "
            "confirm in the data that it is recorded independently of the diabetes label "
            "(not a consequence or proxy of it) and that users could supply it at prediction time."
        ),
    },
]

BY_NAME: dict[str, dict[str, Any]] = {f["name"]: f for f in FEATURES}
assert tuple(BY_NAME) == FEATURE_ORDER, "FEATURES and FEATURE_ORDER are out of sync"
assert "diabetes" not in BY_NAME, "the target must never be an input"


def bounds(name: str) -> tuple[float, float]:
    f = BY_NAME[name]
    return f["min"], f["max"]
