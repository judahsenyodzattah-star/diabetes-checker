import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">University machine-learning project</p>
        <h1 tabIndex={-1}>Explore how a machine-learning model classifies diabetes</h1>
        <p className="lead">
          This project demonstrates a classification model that takes ten everyday and health-related details and
          estimates whether a person falls into the “diabetes” or “no diabetes” group of its training data. It is built
          for learning and is not a medical tool.
        </p>
        <div className="actions">
          <Link to="/predict" className="btn btn-primary btn-lg">
            Start a prediction
          </Link>
          <Link to="/performance" className="btn btn-secondary btn-lg">
            See model performance
          </Link>
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li>
            <h3>1. Enter ten details</h3>
            <p>Age, sex, blood pressure, cholesterol, BMI, smoking, physical activity, family history, stress and heart disease. Whether or not the person has diabetes is never asked; it is what the model predicts.</p>
          </li>
          <li>
            <h3>2. The server predicts</h3>
            <p>Your values are sent to the backend, which validates them, applies the same preprocessing used in training, and runs the model.</p>
          </li>
          <li>
            <h3>3. Read the result</h3>
            <p>You get the predicted class and, when the model provides it, an estimated probability, with a plain-language explanation of what it does and doesn’t mean.</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="privacy" className="card">
        <h2 id="privacy">Your information</h2>
        <p>
          Values you enter are used only to compute the prediction. The backend does not save them to a database or
          log them. Even so, this is a student project: please don’t enter real patient data.
        </p>
      </section>
    </>
  );
}
