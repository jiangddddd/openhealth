import { useEffect, useState } from "react";

import { fetchHomeOverview, fetchProfile } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A polished English workspace for dream interpretation, mood tracking, and daily reflection."
        actions={<span className="badge">{profile.membershipStatus === "pro" ? "PRO" : "FREE"}</span>}
      />

      <Card className="hero-card">
        <div className="hero-grid">
          <div>
            <div className="page-eyebrow">Today</div>
            <h2 className="hero-title">Start with a calm check-in.</h2>
            <p className="card-subtitle">
              Capture a dream, save a mood, and let the system keep today's summary aligned with the newest context.
            </p>
            <div className="hero-note">
              <div className="hero-note-label">Daily cue</div>
              <p>{todaySummary?.reminder || "No summary yet. Add a dream or mood entry to generate a fresh daily overview."}</p>
            </div>
            <div className="button-row">
              <PrimaryButton onClick={() => navigate("dream")}>Log a dream</PrimaryButton>
              <SecondaryButton onClick={() => navigate("mood")}>Log a mood</SecondaryButton>
            </div>
          </div>
          <div className="hero-side">
            <div className="metrics-grid">
              <Card className="metric-card">
                <strong>{profile.totalDreamCount || 0}</strong>
                <span>Total dreams</span>
              </Card>
              <Card className="metric-card">
                <strong>{profile.consecutiveDays || 0}</strong>
                <span>Active streak</span>
              </Card>
              <Card className="metric-card">
                <strong>{todaySummary ? "Ready" : "Pending"}</strong>
                <span>Today summary</span>
              </Card>
            </div>
            <div className="spotlight-card">
              <div className="spotlight-label">Latest focus</div>
              <h3>{latestMood?.moodType || "No mood logged yet"}</h3>
              <p>
                {latestMood
                  ? `${latestMood.moodReason || "A recent mood entry is ready for review."}`
                  : "Once you save a mood, this card becomes a quick emotional snapshot for the day."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="page-grid">
        <Card title="Today's summary" subtitle="The latest daily overview generated from today's records." className="feature-card summary-surface">
          <p className="content-copy">{todaySummary?.reminder || "No summary yet. Add a mood or dream to generate one."}</p>
          <SecondaryButton onClick={() => navigate("summary")}>Open summary</SecondaryButton>
        </Card>

        <Card title="Latest mood" subtitle="Your newest mood snapshot and context." className="feature-card mood-surface">
          <p className="content-copy">
            {latestMood ? `${latestMood.moodType} · intensity ${latestMood.moodIntensity} / 5` : "No mood entry yet."}
          </p>
          <SecondaryButton onClick={() => navigate("mood")}>Open mood page</SecondaryButton>
        </Card>

        <Card title="Latest dream" subtitle="Open the newest dream interpretation in one click." className="wide-card feature-card dream-surface">
          <p className="content-copy">{latestDream?.summary || "Your dream highlights will show up here after your first log."}</p>
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
            <SecondaryButton onClick={() => navigate("trend")}>View trends</SecondaryButton>
          </div>
        </Card>
      </div>
    </>
  );
}
