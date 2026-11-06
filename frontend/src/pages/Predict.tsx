import { FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FeatureField from "../components/FeatureField";
import { ApiError, getFeatures, predict } from "../api/client";
import type { Feature } from "../api/types";
import { useAsync } from "../lib/useAsync";
import { FormErrors, FormValues, validateField, validateForm } from "../lib/validation";

const GROUPS: { title: string; names: string[] }[] = [
  { title: "About the person", names: ["age", "sex"] },
  { title: "Measurements", names: ["blood_pressure", "cholesterol", "bmi"] },
  { title: "Lifestyle and history", names: ["smoker", "physical_activity", "stress_level", "family_history", "heart_disease"] },
];

function groupFeatures(features: Feature[]) {
  const known = new Set(GROUPS.flatMap((g) => g.names));
  const groups = GROUPS.map((g) => ({
    title: g.title,
    items: g.names.map((n) => features.find((f) => f.name === n)).filter((f): f is Feature => !!f),
  }));
  const rest = features.filter((f) => !known.has(f.name));
  if (rest.length) groups.push({ title: "Other details", items: rest });
  return groups.filter((g) => g.items.length > 0);
}

export default function Predict() {
  const navigate = useNavigate();
  const { data, error: loadError, loading, reload } = useAsync(getFeatures, []);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const features = data?.features ?? [];

  const setValue = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((e) => {
      if (!e[name]) return e;
      const { [name]: _removed, ...rest } = e;
      return rest;
    });
  };

  const onBlur = (name: string) => {
    const f = features.find((x) => x.name === name);
    if (!f || (values[name] ?? "") === "") return; // don't nag before the user has typed anything
    const msg = validateField(f, values[name]);
    setErrors((e) => (msg ? { ...e, [name]: msg } : e));
  };

  const focusSummary = () => setTimeout(() => summaryRef.current?.focus(), 0);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    setServerError(null);
    const { errors: found, payload } = validateForm(features, values);
    setErrors(found);
    if (!payload) {
      focusSummary();
      return;
    }
    setSubmitting(true);
    try {
      const response = await predict(payload);
      navigate("/results", { state: { response, inputs: payload, features } });
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "VALIDATION_ERROR" && e.fields?.length) {
        setErrors(Object.fromEntries(e.fields.map((f) => [f.field, f.message])));
      }
      setServerError(e.message ?? "Something went wrong. Please try again.");
      focusSummary();
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setValues({});
    setErrors({});
    setServerError(null);
  };

  const errorEntries = Object.entries(errors);
  const labelOf = (name: string) => features.find((f) => f.name === name)?.label ?? name;

  return (
    <>
      <h1 tabIndex={-1}>Make a prediction</h1>
      <p className="lead">
        Fill in all ten details. Each field has a short description. Nothing here asks whether the person has diabetes.
      </p>

      {loading && (
        <div className="card" role="status" aria-live="polite">
          Loading the form…
        </div>
      )}

      {loadError && (
        <div className="card card-error" role="alert">
          <h2>The form couldn’t be loaded</h2>
          <p>{loadError.message}</p>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {data && (
        <form onSubmit={onSubmit} noValidate aria-describedby="form-notice">
          {data.notice && (
            <p id="form-notice" className="notice">
              <strong>Provisional input definitions.</strong> {data.notice}
            </p>
          )}

          {(errorEntries.length > 0 || serverError) && (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
              <h2>{serverError && errorEntries.length === 0 ? "We couldn’t get a prediction" : "Please fix the following"}</h2>
              {serverError && <p>{serverError}</p>}
              {errorEntries.length > 0 && (
                <ul>
                  {errorEntries.map(([name, msg]) => (
                    <li key={name}>
                      <a
                        href={`#${name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          (document.getElementById(name) ?? document.querySelector<HTMLElement>(`[name="${name}"]`))?.focus();
                        }}
                      >
                        {labelOf(name)}
                      </a>
                      : {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {groupFeatures(features).map((g) => (
            <section key={g.title} className="card form-group" aria-label={g.title}>
              <h2>{g.title}</h2>
              <div className="field-grid">
                {g.items.map((f) => (
                  <FeatureField
                    key={f.name}
                    feature={f}
                    value={values[f.name] ?? ""}
                    error={errors[f.name]}
                    onChange={setValue}
                    onBlur={onBlur}
                    disabled={submitting}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Getting prediction…
                </>
              ) : (
                "Get prediction"
              )}
            </button>
            <button type="button" className="btn btn-secondary" onClick={reset} disabled={submitting}>
              Clear form
            </button>
          </div>
          <p className="muted" role="status" aria-live="polite">
            {submitting ? "Contacting the prediction service…" : ""}
          </p>
        </form>
      )}
    </>
  );
}
