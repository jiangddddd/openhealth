import { useEffect, useMemo, useState } from "react";

import { fetchSummaryToday, generateSummary } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

function parseStoredSummary(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function SummaryPage({ token, openLogin, navigate, selectedSummaryData, setSelectedSummaryData }) {
  const presetSummary = useMemo(() => parseStoredSummary(selectedSummaryData), [selectedSummaryData]);
  const [state, setState] = useState({
    loading: !presetSummary,
    error: "",
    detail: presetSummary,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (presetSummary) {
        setState({ loading: false, error: "", detail: presetSummary });
        return;
      }
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", detail: null });
        }
        return;
      }

      try {
        let detail = await fetchSummaryToday(token);
        if (!detail) {
          detail = await generateSummary(token, { forceRegenerate: false });
        }
        if (active) {
          setState({ loading: false, error: "", detail });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, detail: null });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [presetSummary, token]);

  if (state.loading) {
    return <LoadingBlock title="Loading daily summary" description="Trying cached summary first, then generating a new one if needed." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view the daily summary" : "Summary unavailable"}
        description={state.error === "NOT_LOGIN" ? "Today's summary is generated per user account." : state.error}
        actionText={state.error === "NOT_LOGIN" ? "Open login" : "Go to mood page"}
        onAction={state.error === "NOT_LOGIN" ? openLogin : () => navigate("mood")}
      />
    );
  }

  const detail = state.detail;

  return (
    <>
      <PageHeader
        title="Daily Summary"
        description="This page always tries to reuse today's summary first, and falls back to generation only when needed."
      />

      <Card className="hero-card" title="Overall status" subtitle={detail.summaryDate}>
        <p className="summary-highlight">{detail.overallStatus}</p>
      </Card>

      <div className="page-grid">
        <Card title="Main factors">
          <p className="content-copy">{detail.mainFactors}</p>
        </Card>
        <Card title="Attention point">
          <p className="content-copy">{detail.attentionPoint}</p>
        </Card>
        <Card title="Reminder" className="wide-card">
          <p className="content-copy">{detail.reminder}</p>
        </Card>
        <Card title="Diet direction">
          <p className="content-copy">{detail.dietAdvice?.direction}</p>
        </Card>
        <Card title="Eat more">
          <ul className="bullet-list">{(detail.dietAdvice?.eatMore || []).map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
        <Card title="Eat less">
          <ul className="bullet-list">{(detail.dietAdvice?.eatLess || []).map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
      </div>

      <Card>
        <div className="button-row">
          <PrimaryButton
            onClick={async () => {
              if (!token) {
                openLogin();
                return;
              }
              const detail = await generateSummary(token, { forceRegenerate: true });
              setState({ loading: false, error: "", detail });
              setSelectedSummaryData("");
            }}
          >
            Regenerate summary
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate("history")}>Open history</SecondaryButton>
        </div>
      </Card>
    </>
  );
}
