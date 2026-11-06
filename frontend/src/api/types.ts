// Mirrors docs/API.md. Keep in sync with backend/app/schemas.py.

export type FeatureOption = { value: string | boolean; label: string };

export type Feature = {
  name: string;
  label: string;
  type: "integer" | "number" | "category" | "boolean";
  unit?: string | null;
  min?: number;
  max?: number;
  step?: number;
  help: string;
  options?: FeatureOption[];
  provisional?: boolean;
  review_note?: string;
};

export type FeaturesResponse = { provisional: boolean; notice: string | null; features: Feature[] };

export type PredictionInput = Record<string, string | number | boolean>;

export type PredictionResponse = {
  request_id: string;
  prediction: { label: "diabetes" | "no_diabetes"; positive_class: boolean; probability: number | null };
  model: { mode: "mock" | "real"; name: string; version: string | null; is_demonstration: boolean };
  disclaimer: string;
};

export type ModelStatus = {
  mode: "mock" | "real";
  loaded: boolean;
  is_demonstration: boolean;
  name: string | null;
  version: string | null;
  error: string | null;
};

export type HealthResponse = { status: "ok"; api_version: string; model: ModelStatus };

export type MetricsResponse = {
  available: boolean;
  error: string | null;
  metrics: {
    model_name: string | null;
    evaluated_on: string | null;
    notes: string | null;
    confusion_matrix: { tn: number | null; fp: number | null; fn: number | null; tp: number | null };
    accuracy: number | null;
    precision: number | null;
    recall: number | null;
    f1: number | null;
  } | null;
};
