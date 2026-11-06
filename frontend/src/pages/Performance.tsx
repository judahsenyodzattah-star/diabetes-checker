import { getMetrics } from "../api/client";
import type { MetricsResponse } from "../api/types";
import { useAsync } from "../lib/useAsync";

type M = NonNullable<MetricsResponse["metrics"]>;

const pct = (v: number | null) => (v === null ? null : `${(v * 100).toFixed(1)}%`);

function ConfusionMatrix({ cm }: { cm: M["confusion_matrix"] }) {
  const n = (v: number | null) => (v === null ? "Not supplied" : v.toLocaleString());
  return (
    <div className="table-wrap">
      <table className="cm">
        <caption>Confusion matrix (counts of test examples). Rows are the actual class; columns are what the model predicted.</caption>
        <thead>
          <tr>
            <td />
            <th scope="col">Predicted: no diabetes</th>
            <th scope="col">Predicted: diabetes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Actual: no diabetes</th>
            <td className="cm-good"><span className="cm-name">True negatives (TN)</span><span className="cm-num">{n(cm.tn)}</span></td>
            <td className="cm-bad"><span className="cm-name">False positives (FP)</span><span className="cm-num">{n(cm.fp)}</span></td>
          </tr>
          <tr>
            <th scope="row">Actual: diabetes</th>
            <td className="cm-bad"><span className="cm-name">False negatives (FN)</span><span className="cm-num">{n(cm.fn)}</span></td>
            <td className="cm-good"><span className="cm-name">True positives (TP)</span><span className="cm-num">{n(cm.tp)}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const SCORES: { key: "accuracy" | "precision" | "recall" | "f1"; label: string; text: string }[] = [
  { key: "accuracy", label: "Accuracy", text: "Of all examples, the share the model classified correctly." },
  { key: "precision", label: "Precision", text: "Of the examples the model called “diabetes”, the share that really were." },
  { key: "recall", label: "Recall", text: "Of the examples that really were “diabetes”, the share the model found." },
  { key: "f1", label: "F1 score", text: "A single number balancing precision and recall (their harmonic mean)." },
];

function Glossary() {
  return (
    <>
      <section className="card" aria-labelledby="terms">
        <h2 id="terms">Reading the confusion matrix</h2>
        <p>
          The model makes a yes/no call for each example, and each call is compared with the true answer. Here “positive”
          means the <strong>diabetes</strong> class.
        </p>
        <dl className="glossary">
          <div><dt>True positive (TP)</dt><dd>The model said “diabetes” and the person really had it in the data.</dd></div>
          <div><dt>True negative (TN)</dt><dd>The model said “no diabetes” and that was correct.</dd></div>
          <div><dt>False positive (FP)</dt><dd>The model said “diabetes” but the person did not have it. A false alarm.</dd></div>
          <div><dt>False negative (FN)</dt><dd>The model said “no diabetes” but the person did have it. A missed case.</dd></div>
        </dl>
      </section>
      <section className="card" aria-labelledby="scores">
        <h2 id="scores">What the scores measure</h2>
        <dl className="glossary">
          {SCORES.map((s) => (
            <div key={s.key}><dt>{s.label}</dt><dd>{s.text}</dd></div>
          ))}
        </dl>
        <p className="muted small">No single score tells the whole story: with uneven class sizes, accuracy alone can look good while many cases are missed.</p>
      </section>
    </>
  );
}

export default function Performance() {
  const { data, error, loading, reload } = useAsync(getMetrics, []);

  return (
    <>
      <h1 tabIndex={-1}>Model performance</h1>
      <p className="lead">How well the model did on data it had not seen during training, as reported by the project author.</p>

      {loading && <div className="card" role="status">Loading metrics…</div>}

      {error && (
        <div className="card card-error" role="alert">
          <h2>Metrics couldn’t be loaded</h2>
          <p>{error.message}</p>
          <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
        </div>
      )}

      {data && !data.available && (
        <section className="card empty" aria-labelledby="empty-title">
          <h2 id="empty-title">{data.error ? "The metrics file has a problem" : "No evaluation results yet"}</h2>
          {data.error ? (
            <p role="alert">The metrics file was found but could not be used: {data.error}. Nothing is shown rather than showing wrong numbers.</p>
          ) : (
            <p>
              Real evaluation scores haven’t been supplied, and this page never shows made-up numbers. Once the model
              has been trained and evaluated, add <code>backend/model_artifacts/metrics.json</code> (a template is next to it
              as <code>metrics.example.json</code>) and reload this page.
            </p>
          )}
        </section>
      )}

      {data?.available && data.metrics && (
        <>
          {(data.metrics.model_name || data.metrics.evaluated_on) && (
            <p className="muted">
              {data.metrics.model_name && <>Model: <strong>{data.metrics.model_name}</strong>. </>}
              {data.metrics.evaluated_on && <>Evaluated on: {data.metrics.evaluated_on}.</>}
            </p>
          )}
          <section className="card" aria-labelledby="cm-title">
            <h2 id="cm-title">Confusion matrix</h2>
            {Object.values(data.metrics.confusion_matrix).every((v) => v === null) ? (
              <p className="muted">A confusion matrix has not been supplied.</p>
            ) : (
              <ConfusionMatrix cm={data.metrics.confusion_matrix} />
            )}
          </section>
          <section aria-labelledby="scores-title">
            <h2 id="scores-title">Scores</h2>
            <div className="score-grid">
              {SCORES.map((s) => {
                const shown = pct(data.metrics![s.key]);
                return (
                  <div className="score card" key={s.key}>
                    <p className="score-label">{s.label}</p>
                    <p className={shown ? "score-value" : "score-value none"}>{shown ?? "Not supplied"}</p>
                  </div>
                );
              })}
            </div>
          </section>
          {data.metrics.notes && <p className="card">{data.metrics.notes}</p>}
        </>
      )}

      <Glossary />
    </>
  );
}
