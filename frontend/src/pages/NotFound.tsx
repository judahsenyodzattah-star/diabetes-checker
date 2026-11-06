import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="card">
      <h1 tabIndex={-1}>Page not found</h1>
      <p>That page doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </section>
  );
}
