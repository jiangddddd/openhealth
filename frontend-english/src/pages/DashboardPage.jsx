import { useEffect, useState } from "react";

import { fetchHomeOverview, fetchProfile } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

function truncateText(value, maxLength = 90) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

export default function DashboardPage({ token, openLogin, navigate, setSelectedDreamId }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    overview: null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", profile: null, overview: null });
        }
        return;
      }

      try {
        const [profile, overview] = await Promise.all([
          fetchProfile(token),
          fetchHomeOverview(token),
        ]);

        if (active) {
          setState({ loading: false, error: "", profile, overview });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, profile: null, overview: null });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.loading) {
    return <LoadingBlock title="Loading dashboard" description="Fetching your latest overview." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view your dashboard" : "Dashboard unavailable"}
        description={state.error === "NOT_LOGIN" ? "Your summaries, moods, and dreams will appear here after login." : state.error}
        actionText={state.error === "NOT_LOGIN" ? "Open login" : "Try login again"}
        onAction={openLogin}
      />
    );
  }

  const profile = state.profile || {};
  const overview = state.overview || {};
  const latestDream = overview.latestDream || null;
  const latestMood = overview.latestMood || null;
  const todaySummary = overview.todaySummary || null;
  const membershipLabel = profile.membershipStatus === "pro" ? "PRO access" : "Free workspace";
  const streakLabel = profile.consecutiveDays > 0 ? `${profile.consecutiveDays} day streak` : "Start tonight";
  const summaryLead = truncateText(
    todaySummary?.reminder || "No summary yet. Start with a dream or mood log to build today's thread.",
    88,
  );
  const latestDreamLead = truncateText(
    latestDream?.summary || "Your newest dream note will show up here once you save it.",
    84,
  );
  const latestMoodLead = latestMood
    ? `${latestMood.moodType} · intensity ${latestMood.moodIntensity}/5`
    : "No mood logged yet";

  const dockItems = [
    {
      key: "summary",
      label: "Summary",
      title: todaySummary ? "Today is ready" : "Still waiting",
      text: summaryLead,
      action: todaySummary ? "Open summary" : "Create first log",
      onClick: () => navigate(todaySummary ? "summary" : "journal"),
    },
    {
      key: "mood",
      label: "Mood",
      title: latestMood?.moodType || "Capture a mood",
      text: latestMood
        ? truncateText(latestMood.moodReason || "A recent mood entry is ready for review.", 84)
        : "Save a quick emotional snapshot for the day.",
      action: latestMood ? "Open mood page" : "Log a mood",
      onClick: () => navigate("mood"),
    },
    {
      key: "dream",
      label: "Dream",
      title: latestDream?.title || "Record a dream",
      text: latestDreamLead,
      action: latestDream?.dreamRecordId ? "Open latest result" : "Log a dream",
      onClick: () => {
        if (latestDream?.dreamRecordId) {
          setSelectedDreamId(String(latestDream.dreamRecordId));
          navigate("result");
          return;
        }
        navigate("dream");
      },
    },
  ];

  return (
    <>
      <section className="english-atlas">
        <div className="english-atlas-inner">
          <div className="english-atlas-copy">
            <div className="english-atlas-lockup">
              <span className="english-atlas-tagline">Quiet tracking for dreams and moods</span>
              <span className="english-atlas-name">MYDREAM</span>
            </div>

            <div className="english-atlas-meta">
              <span className="english-atlas-chip">{membershipLabel}</span>
              <span className="english-atlas-meta-text">{streakLabel}</span>
            </div>

            <h1 className="english-atlas-title">Log tonight. Read the pattern later.</h1>
            <p className="english-atlas-body">
              Dreams, moods, and daily summaries stay in one calm workspace.
            </p>

            <div className="english-atlas-actions">
              <PrimaryButton onClick={() => navigate("dream")}>Log a dream</PrimaryButton>
              <SecondaryButton onClick={() => navigate("mood")}>Log a mood</SecondaryButton>
            </div>
          </div>

          <div className="english-atlas-scene" aria-hidden="true">
            <div className="english-atlas-scene-kicker">Tonight&apos;s ledger</div>
            <div className="english-atlas-scene-word">MYDREAM</div>

            <div className="english-atlas-signal-list">
              <div className="english-atlas-signal-item">
                <span>Today</span>
                <strong>{summaryLead}</strong>
              </div>
              <div className="english-atlas-signal-item">
                <span>Latest dream</span>
                <strong>{truncateText(latestDream?.title || "No dream recorded yet", 28)}</strong>
              </div>
              <div className="english-atlas-signal-item">
                <span>Latest mood</span>
                <strong>{latestMoodLead}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="english-atlas-dock" aria-label="Primary actions">
          {dockItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="english-atlas-dock-item"
              onClick={item.onClick}
            >
              <span className="english-atlas-dock-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <span className="english-atlas-dock-action">{item.action}</span>
            </button>
          ))}
        </div>

        <div className="english-atlas-links">
          <button type="button" className="english-atlas-link" onClick={() => navigate("journal")}>
            <strong>Open logbook</strong>
            <span>Choose dream, mood, or summary first.</span>
          </button>
          <button type="button" className="english-atlas-link" onClick={() => navigate("trend")}>
            <strong>Review trends</strong>
            <span>See what has repeated across recent entries.</span>
          </button>
        </div>
      </section>

      <div className="english-dashboard-grid">
        <Card className="english-panel english-panel-stats">
          <div className="english-panel-kicker">Selected KPIs</div>
          <div className="english-stat-list">
            <div className="english-stat-item">
              <span>Total dreams</span>
              <strong>{profile.totalDreamCount || 0}</strong>
            </div>
            <div className="english-stat-item">
              <span>Active streak</span>
              <strong>{profile.consecutiveDays || 0}</strong>
            </div>
            <div className="english-stat-item">
              <span>Today summary</span>
              <strong>{todaySummary ? "Ready" : "Pending"}</strong>
            </div>
          </div>
        </Card>

        <Card title="Summary cue" subtitle="Latest daily direction generated from today's records." className="english-panel">
          <p className="content-copy">{summaryLead}</p>
          <SecondaryButton onClick={() => navigate("summary")}>Open summary</SecondaryButton>
        </Card>

        <Card title="Mood snapshot" subtitle="The newest emotional context available in the workspace." className="english-panel">
          <p className="content-copy">
            {latestMood
              ? truncateText(latestMood.moodReason || `${latestMood.moodType} recorded for today.`, 96)
              : "No mood entry yet. Save one to give the day a clearer emotional anchor."}
          </p>
          <SecondaryButton onClick={() => navigate("mood")}>
            {latestMood ? "Open mood page" : "Log a mood"}
          </SecondaryButton>
        </Card>

        <Card title="Dream workspace" subtitle="Quick access to the latest dream interpretation and archive routes." className="english-panel wide-card english-panel-dream">
          <p className="content-copy">{latestDreamLead}</p>
          <div className="button-row">
            <PrimaryButton
              onClick={() => {
                if (latestDream?.dreamRecordId) {
                  setSelectedDreamId(String(latestDream.dreamRecordId));
                  navigate("result");
                  return;
                }
                navigate("dream");
              }}
            >
              {latestDream?.dreamRecordId ? "Open latest result" : "Create first dream log"}
            </PrimaryButton>
            <SecondaryButton onClick={() => navigate("history")}>Open archive</SecondaryButton>
          </div>
        </Card>
      </div>

    </>
  );
}
