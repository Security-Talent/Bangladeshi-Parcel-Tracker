import React, { useEffect, useMemo, useState } from "react";

const PHONE_COURIERS = new Set(["pathao", "rokomari"]);

export default function App() {
  const [couriers, setCouriers] = useState([]);
  const [courier, setCourier] = useState("redx");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const needsPhone = useMemo(() => PHONE_COURIERS.has(courier), [courier]);

  useEffect(() => {
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) throw new Error("API server is not available.");
        return response.json();
      })
      .then((data) => {
        setCouriers(data.couriers);
        setApiReady(true);
      })
      .catch(() => setApiReady(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier,
          trackingNumber,
          ...(needsPhone ? { phone } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data);
      } else {
        setResult(data);
      }
    } catch {
      setError({ code: "API_UNAVAILABLE", message: "Could not reach the local demo API." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Parcel tracker home">
          <span className="brand-mark">PT</span>
          <span>Parcel Tracker</span>
        </a>
        <span className={`connection ${apiReady ? "online" : "offline"}`}>
          <span className="connection-dot" />
          {apiReady ? "Package API connected" : "Start the local API server"}
        </span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">NPM PACKAGE · REACT DEMO</p>
        <h1>Track a delivery.<br /><em>See the package in action.</em></h1>
        <p className="intro-copy">
          This React form calls a small local API, which imports the package and contacts the selected courier.
          Use a tracking number and phone number you are authorized to access.
        </p>
      </section>

      <section className="workspace" aria-label="Parcel tracking demo">
        <form className="tracker-card" onSubmit={handleSubmit}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">LOOK UP A PARCEL</p>
              <h2>Tracking details</h2>
            </div>
            <span className="step-tag">01 / 02</span>
          </div>

          <label htmlFor="courier">Courier service</label>
          <select id="courier" value={courier} onChange={(event) => setCourier(event.target.value)} required>
            {(couriers.length ? couriers : ["redx", "steadfast", "pathao", "rokomari", "sundarban"]).map((name) => (
              <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>
            ))}
          </select>

          <label htmlFor="tracking-number">Tracking number</label>
          <input
            id="tracking-number"
            autoComplete="off"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Enter your tracking number"
            required
          />

          {needsPhone && <>
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number used for this delivery"
              required
            />
            <p className="field-note">Required by {courier[0].toUpperCase() + courier.slice(1)} for its tracking lookup.</p>
          </>}

          <button type="submit" disabled={loading || !apiReady}>
            {loading ? "Contacting courier…" : "Track parcel"}
            {!loading && <span aria-hidden="true">↗</span>}
          </button>
          <p className="privacy-note">Your lookup is sent to the courier. This demo does not save it.</p>
        </form>

        <section className="result-card" aria-live="polite">
          <div className="card-heading">
            <div>
              <p className="eyebrow">PACKAGE RESPONSE</p>
              <h2>{result ? "Tracking result" : error ? "Request issue" : "Your result appears here"}</h2>
            </div>
            <span className="step-tag">02 / 02</span>
          </div>

          {!result && !error && <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">↗</span>
            <p>Choose a courier and enter your details to make a live lookup.</p>
            <span className="empty-caption">LIVE COURIER REQUEST</span>
          </div>}

          {error && <div className="error-state" role="alert">
            <span className="error-code">{error.code || "TRACKING_ERROR"}</span>
            <p>{error.message || "The tracking request failed."}</p>
            <span className="retry-hint">{error.retryable ? "You can try again shortly." : "Check your details or try another time."}</span>
          </div>}

          {result && <div className="result-content">
            <div className="status-panel">
              <span className="status-label">CURRENT STATUS</span>
              <strong>{result.status.label}</strong>
              <span className="status-source">{result.status.sourceStatus || result.status.code}</span>
            </div>
            <dl className="result-meta">
              <div><dt>Courier</dt><dd>{result.courier}</dd></div>
              <div><dt>Tracking number</dt><dd>{result.trackingNumber}</dd></div>
              <div><dt>Estimated delivery</dt><dd>{result.estimatedDelivery || "Not provided"}</dd></div>
            </dl>
            <div className="events-heading"><h3>Tracking events</h3><span>{result.events.length}</span></div>
            {result.events.length ? <ol className="events-list">
              {result.events.map((item, index) => <li key={`${item.timestamp}-${index}`}>
                <span className="event-dot" />
                <div><strong>{item.status || item.description || "Tracking update"}</strong>
                  {item.description && item.status && <p>{item.description}</p>}
                  <small>{[item.timestamp, item.location].filter(Boolean).join(" · ") || "Time/location not provided"}</small>
                </div>
              </li>)}
            </ol> : <p className="no-events">The courier response did not include a recognized event timeline.</p>}
            <details className="response-details">
              <summary>Normalized package response</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>}
        </section>
      </section>

      <footer className="footer-note">
        <span>PACKAGE BUILD · 1.3.0</span>
        <span>Results depend on courier endpoint availability and response formats.</span>
      </footer>
    </main>
  );
}
