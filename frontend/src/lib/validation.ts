import type { Feature, PredictionInput } from "../api/types";

/** Raw form state: everything is a string; booleans are "true" | "false" | "". */
export type FormValues = Record<string, string>;
export type FormErrors = Record<string, string>;

const fmt = (n: number) => String(Number(n.toFixed(6)));

export function rangeText(f: Feature): string | null {
  if (f.min === undefined || f.max === undefined) return null;
  return `${fmt(f.min)} to ${fmt(f.max)}${f.unit ? ` ${f.unit}` : ""}`;
}

export function validateField(f: Feature, raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (f.type === "category" || f.type === "boolean") {
    if (value === "") return "Please choose an option.";
    const allowed = (f.options ?? []).map((o) => String(o.value));
    return allowed.includes(value) ? null : "Please choose one of the listed options.";
  }
  if (value === "") return "Enter a value.";
  // Accept only plain decimal numbers (no "1e3", hex, or thousands separators).
  if (!/^-?\d+(\.\d+)?$/.test(value)) return "Enter a number using digits only, for example 25.5.";
  const n = Number(value);
  if (f.type === "integer" && !Number.isInteger(n)) return "Enter a whole number.";
  if (f.min !== undefined && n < f.min) return `Must be at least ${fmt(f.min)}.`;
  if (f.max !== undefined && n > f.max) return `Must be at most ${fmt(f.max)}.`;
  return null;
}

export function validateForm(
  features: Feature[],
  values: FormValues,
): { errors: FormErrors; payload: PredictionInput | null } {
  const errors: FormErrors = {};
  for (const f of features) {
    const msg = validateField(f, values[f.name]);
    if (msg) errors[f.name] = msg;
  }
  if (Object.keys(errors).length > 0) return { errors, payload: null };

  const payload: PredictionInput = {};
  for (const f of features) {
    const v = values[f.name].trim();
    payload[f.name] = f.type === "boolean" ? v === "true" : f.type === "category" ? v : Number(v);
  }
  return { errors, payload };
}
