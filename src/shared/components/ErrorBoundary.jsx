import { Component } from "react";

// Top-level boundary: turns a render-time crash anywhere in the tree into a
// readable message + reload, instead of a blank (black) screen.
// NOTE: this only catches errors thrown during React render/lifecycle. A crash
// at module load (e.g. missing env vars in services/supabase.js) happens before
// React runs and is NOT caught here — the index.html boot fallback covers that.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          color: "var(--text, #eee)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          Something went wrong.
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, maxWidth: 360 }}>
          The app hit an unexpected error and couldn’t continue.
        </div>
        <button
          className="detail-btn sel"
          onClick={() => window.location.reload()}
          style={{ marginTop: 8 }}
        >
          Reload
        </button>
      </div>
    );
  }
}
