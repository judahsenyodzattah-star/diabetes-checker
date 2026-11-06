export default function About() {
  return (
    <>
      <h1 tabIndex={-1}>About this project</h1>
      <p className="lead">A university project exploring how a classification model can be built, evaluated and served through a web application.</p>

      <section className="card" aria-labelledby="purpose">
        <h2 id="purpose">Educational purpose</h2>
        <p>
          The goal is to learn the full machine-learning workflow: preparing data, training and evaluating a model, and
          making it usable through an API and web interface. It is not a clinical tool, has not been validated for
          medical use, and must not be used to make decisions about anyone’s health or care.
        </p>
      </section>

      <section className="card" aria-labelledby="dataset">
        <h2 id="dataset">The dataset</h2>
        <p>
          The model learns from a tabular dataset in which each row describes a person with ten input values and a
          recorded diabetes outcome. The outcome is the prediction target and is never an input in this app.
        </p>
        <p className="notice">
          <strong>To be completed by the project author:</strong> the dataset’s name, source, licence, size, collection
          period, and the exact units and meaning of each variable (especially blood pressure, cholesterol, and the
          physical-activity and stress scores) have not yet been added. The form’s units and limits are placeholders
          until they are confirmed against the data dictionary.
        </p>
      </section>

      <section className="card" aria-labelledby="approach">
        <h2 id="approach">Model approach</h2>
        <p>
          The intended design is a single saved scikit-learn pipeline: preprocessing (such as encoding and scaling)
          and a classifier packaged together, so the same transformations used in training are applied at prediction time.
          The pipeline runs only on the backend; the browser sends the raw values and receives a class and, if the model
          supports it, a probability.
        </p>
        <p>
          Until the trained model is connected, the backend runs a <strong>mock adapter</strong> that returns deterministic
          sample responses. Every such response is labelled as a demonstration, and the app always says so on screen.
        </p>
      </section>

      <section className="card" aria-labelledby="limits">
        <h2 id="limits">Limitations</h2>
        <ul className="plain-list">
          <li>A model reflects its training data. If the data is small, old, or unrepresentative of a population, predictions will be less reliable for people unlike those in it.</li>
          <li>Only ten inputs are used. Many factors relevant to health are not included.</li>
          <li>Predictions are statistical estimates and can be wrong, both as false alarms and as missed cases. See the model performance page for measured error counts, once supplied.</li>
          <li>A probability is the model’s confidence, not a calibrated chance unless that has been checked separately.</li>
          <li>Correlation in data is not causation; the model does not explain why it made a prediction.</li>
          <li>Input definitions may include simplifications (for example a single blood-pressure value).</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="privacy">
        <h2 id="privacy">Privacy</h2>
        <p>
          Submitted values are processed in memory to produce a prediction and are not saved or logged by the backend.
          Please don’t enter real patient information in this demonstration.
        </p>
      </section>
    </>
  );
}
