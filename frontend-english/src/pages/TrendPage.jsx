import { useEffect, useMemo, useState } from "react";

import { fetchMoodList, fetchProfile, fetchSummaryList } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader } from "../components/ui.jsx";

function getTopMood(items) {
  const counter = new Map();
  items.forEach((item) => {
    counter.set(item.moodType, (counter.get(item.moodType) || 0) + 1);
  });
  return [...counter.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

export default function TrendPage({ token, openLogin }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    moods: [],
    summaries: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", profile: null, moods: [], summaries: [] });
        }
        return;
      }

      try {
        const [profile, moods, summaries] = await Promise.all([
          fetchProfile(token),
          fetchMoodList(token, 1, 30),
          fetchSummaryList(token, 1, 10),
        ]);
        if (active) {
          setState({
            loading: false,
            error: "",
            profile,
            moods: moods.list || [],
            summaries: summaries.list || [],
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, profile: null, moods: [], summaries: [] });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const dominantMood = useMemo(() => getTopMood(state.moods), [state.moods]);

  if (state.loading) {
    return <LoadingBlock title="Loading trend page" description="Reading recent moods and summaries." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view trends" : "Trend page unavailable"}
        description={state.error === "NOT_LOGIN" ? "Trends are built from your own records." : state.error}
        actionText="Open login"
        onAction={openLogin}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Trends"
        description="A compact English overview of your recent mood records, summaries, and tracking streak."
      />

      <div className="page-grid">
        <Card title="Dominant mood">
          <p className="summary-highlight">{dominantMood ? dominantMood[0] : "No data yet"}</p>
          <p className="card-subtitle">{dominantMood ? `${dominantMood[1]} recent entries` : "Add more mood logs to unlock trend insight."}</p>
        </Card>

        <Card title="Streak">
          <p className="summary-highlight">{state.profile?.consecutiveDays || 0} days</p>
          <p className="card-subtitle">The backend recalculates streaks using dream and mood records together.</p>
        </Card>

        <Card title="Recent mood intensity" className="wide-card">
          <div className="bar-stack">
            {state.moods.slice(0, 7).map((item) => (
              <div key={item.moodRecordId} className="bar-row">
                <span>{item.moodType}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.moodIntensity / 5) * 100}%` }} />
                </div>
                <strong>{item.moodIntensity}/5</strong>
              </div>
            ))}
            {!state.moods.length ? <p className="content-copy">No mood trend data yet.</p> : null}
          </div>
        </Card>

        <Card title="Recent summary snapshots" className="wide-card">
          <div className="list-stack">
            {state.summaries.map((item) => (
              <div key={item.summaryId} className="list-row">
                <strong>{item.summaryDate}</strong>
                <p>{item.overallStatus}</p>
              </div>
            ))}
            {!state.summaries.length ? <p className="content-copy">No daily summaries yet.</p> : null}
          </div>
        </Card>
      </div>
    </>
  );
}
