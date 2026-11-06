import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAsync } from "../lib/useAsync";
import { getHealth } from "../api/client";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/predict", label: "Predict" },
  { to: "/performance", label: "Model performance" },
  { to: "/about", label: "About" },
];

function ModelBanner() {
  const { data, error } = useAsync(getHealth, []);
  if (error) {
    return (
      <div className="banner banner-warn" role="status">
        <strong>Service unreachable.</strong> The prediction backend did not respond, so predictions are unavailable right now.
      </div>
    );
  }
  if (!data) return null;
  if (data.model.is_demonstration) {
    return (
      <div className="banner banner-demo" role="status">
        <strong>Demonstration mode.</strong> Predictions are deterministic sample responses from a mock adapter, not
        output from a trained model.
      </div>
    );
  }
  if (!data.model.loaded) {
    return (
      <div className="banner banner-warn" role="alert">
        <strong>Model not loaded.</strong> The service is set to use the real model, but it could not be loaded, so
        predictions are disabled.
      </div>
    );
  }
  return null;
}

export default function Layout() {
  const { pathname } = useLocation();

  // Move focus to the page heading on navigation so keyboard / screen-reader users land at the new content.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark" aria-hidden="true" />
            Diabetes Prediction Project
          </NavLink>
          <nav aria-label="Main">
            <ul className="nav-list">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <ModelBanner />
      <main id="main" className="container main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          Educational university project. Not a medical device and not a source of medical advice or diagnosis.
        </div>
      </footer>
    </>
  );
}
