import { Link, useLocation } from "react-router-dom";
import type { Feature, PredictionInput, PredictionResponse } from "../api/types";

type State = { response: PredictionResponse; inputs: PredictionInput; features: Feature[] } | null;

function display(f: Feature, v: string | number | boolean | undefined): string {
  if (v === undefined) return "—";
  const opt = f.options?.find((o) => o.value === v);
  if (opt) return opt.label;
  return f.unit && f.type !== "boolean" ? `${v} ${f.unit}` : String(v);
}

export default function Results() {
  const state = useLocation().state as State;

  if (!state?.response) {
    return (
      <section className="card">
        <h1 tabIndex={-1}>No result to show</h1>
        <p>
          Results are kept only in this browser tab while you view them, and aren’t stored anywhere. Start a new
          prediction to see one.
        </p>
        <Link to="/predict" className="btn btn-primary">
          Start a prediction
        </Link>
      </section>
    );
  }

  const { response, inputs, features } = state;
  const { prediction, model } = response;
  const positive = prediction.positive_class;
  const pct = prediction.probability === null ? null : Math.round(prediction.probability * 1000) / 10;

  return (
    <>
      <h1 tabIndex={-1}>Your result</h1>

      {model.is_demonstration && (
        <div className="banner-inline banner-demo" role="note">
          <strong>Demonstration result.</strong> This was produced by a mock adapter with deterministic sample values. No
          trained model was used and it says nothing about real health.
        </div>
      )}

      <section className={`card result ${positive ? "result-pos" : "result-neg"}`} aria-labelledby="result-class">
        <p className="eyebrow">{model.is_demonstration ? "Sample predicted class" : "Predicted class"}</p>
        <h2 id="result-class" className="result-class">
          {positive ? "Diabetes" : "No diabetes"}
        </h2>

        {pct !== null ? (
          <div>
            <p className="prob-label" id="prob-label">
              Estimated probability of the “diabetes” class: <strong>{pct}%</strong>
            </p>
            <div className="meter" role="meter" aria-labelledby="prob-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="meter-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <p className="muted">This model does not provide a probability estimate for this prediction.</p>
        )}
      </section>

      <section className="card" aria-labelledby="meaning">
        <h2 id="meaning">What this means</h2>
        <ul className="plain-list">
          <li>
            Based on the ten values you entered, the model {model.is_demonstration ? "adapter" : ""} placed this input in the{" "}
            <strong>{positive ? "“diabetes”" : "“no diabetes”"}</strong> group.
          </li>
          {pct !== null && (
            <li>
              The probability is the model’s own confidence score, not a guarantee. {pct}% means the model leans toward
              “diabetes” by that much, and it can be wrong in either direction.
            </li>
          )}
          <li>
            The model only finds statistical patterns in the data it was trained on. It cannot examine a person, and
            many factors that matter are not among its ten inputs.
          </li>
          <li>
            <strong>This is not a diagnosis.</strong> If you have questions about your health, please speak with a
            qualified health professional.
          </li>
        </ul>
        <p className="muted small">{response.disclaimer}</p>
      </section>

      <section className="card" aria-labelledby="entered">
        <h2 id="entered">Values you entered</h2>
        <dl className="entered">
          {features.map((f) => (
            <div key={f.name}>
              <dt>{f.label}</dt>
              <dd>{display(f, inputs[f.name])}</dd>
            </div>
          ))}
        </dl>
        <p className="muted small">
          Model: {model.name} ({model.mode} mode). Request {response.request_id.slice(0, 8)}. Nothing you entered is stored on the server.
        </p>
      </section>

      <div className="actions">
        <Link to="/predict" className="btn btn-primary">
          Try different values
        </Link>
        <Link to="/performance" className="btn btn-secondary">
          How accurate is the model?
        </Link>
      </div>
    </>
  );
}
