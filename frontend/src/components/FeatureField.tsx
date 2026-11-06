import type { Feature } from "../api/types";
import { rangeText } from "../lib/validation";

type Props = {
  feature: Feature;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
  disabled?: boolean;
};

export default function FeatureField({ feature: f, value, error, onChange, onBlur, disabled }: Props) {
  const helpId = `${f.name}-help`;
  const errId = `${f.name}-error`;
  const describedBy = [helpId, error ? errId : null].filter(Boolean).join(" ");
  const range = rangeText(f);

  const help = (
    <>
      <p id={helpId} className="field-help">
        {f.help}
        {range && (
          <>
            {" "}
            <span className="range">Accepted: {range}.</span>
          </>
        )}
      </p>
      {f.review_note && <p className="field-note">Note for the project author: {f.review_note}</p>}
      <p id={errId} className="field-error" aria-live="polite">
        {error}
      </p>
    </>
  );

  if (f.type === "boolean" || f.type === "category") {
    return (
      <fieldset className={`field ${error ? "has-error" : ""}`} aria-describedby={describedBy} aria-invalid={!!error}>
        <legend className="field-label">{f.label}</legend>
        <div className="radio-row">
          {(f.options ?? []).map((o) => {
            const v = String(o.value);
            const id = `${f.name}-${v}`;
            return (
              <label key={id} htmlFor={id} className={`radio ${value === v ? "checked" : ""}`}>
                <input
                  id={id}
                  type="radio"
                  name={f.name}
                  value={v}
                  checked={value === v}
                  disabled={disabled}
                  onChange={() => onChange(f.name, v)}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
        {help}
      </fieldset>
    );
  }

  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={f.name} className="field-label">
        {f.label}
        {f.unit && <span className="unit"> ({f.unit})</span>}
      </label>
      <input
        id={f.name}
        name={f.name}
        type="text"
        inputMode={f.type === "integer" ? "numeric" : "decimal"}
        autoComplete="off"
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(e) => onChange(f.name, e.target.value)}
        onBlur={() => onBlur(f.name)}
      />
      {help}
    </div>
  );
}
