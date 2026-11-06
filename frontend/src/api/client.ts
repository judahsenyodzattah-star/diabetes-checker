import type {
  FeaturesResponse,
  HealthResponse,
  MetricsResponse,
  PredictionInput,
  PredictionResponse,
} from "./types";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 15000;

export type FieldErrors = { field: string; message: string }[];

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number | null = null,
    public readonly fields: FieldErrors = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "The prediction service took too long to respond. Please try again."
        : "Could not reach the prediction service. Check that the backend is running and your connection is working, then try again.",
      timedOut ? "TIMEOUT" : "NETWORK",
    );
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const e = (body as { error?: { code?: string; message?: string; fields?: FieldErrors } } | null)?.error;
    throw new ApiError(
      e?.message ?? `The service returned an unexpected error (HTTP ${res.status}).`,
      e?.code ?? "HTTP_ERROR",
      res.status,
      e?.fields ?? [],
    );
  }
  if (body === null) throw new ApiError("The service returned an unreadable response.", "BAD_RESPONSE", res.status);
  return body as T;
}

export const getFeatures = () => request<FeaturesResponse>("/api/v1/features");
export const getHealth = () => request<HealthResponse>("/api/health");
export const getMetrics = () => request<MetricsResponse>("/api/v1/metrics");
export const predict = (input: PredictionInput) =>
  request<PredictionResponse>("/api/v1/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
