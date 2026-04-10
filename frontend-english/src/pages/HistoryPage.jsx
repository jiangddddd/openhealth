import { useEffect, useMemo, useState } from "react";

import { fetchDreamList, fetchMoodList, fetchSummaryList } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader } from "../components/ui.jsx";

export default function HistoryPage({ token, openLogin, navigate, setSelectedDreamId, setSelectedSummaryData }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    dreams: [],
    moods: [],
    summaries: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", dreams: [], moods: [], summaries: [] });
        }
        return;
      }

      try {
        const [dreams, moods, summaries] = await Promise.all([
          fetchDreamList(token, 1, 20),
          fetchMoodList(token, 1, 20),
          fetchSummaryList(token, 1, 20),
        ]);
        if (active) {
          setState({
            loading: false,
            error: "",
            dreams: dreams.list || [],
            moods: moods.list || [],
            summaries: summaries.list || [],
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, dreams: [], moods: [], summaries: [] });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const mergedItems = useMemo(() => {
    return [
      ...state.dreams.map((item) => ({ ...item, type: "dream", sortTime: item.date })),
      ...state.moods.map((item) => ({ ...item, type: "mood", sortTime: item.createdAt })),
      ...state.summaries.map((item) => ({ ...item, type: "summary", sortTime: item.updatedAt })),
    ];
  }, [state]);

  if (state.loading) {
    return <LoadingBlock title="Loading history" description="Collecting dreams, moods, and summaries." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view history" : "History unavailable"}
        description={state.error === "NOT_LOGIN" ? "History is scoped to a single account." : state.error}
        actionText="Open login"
        onAction={openLogin}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="History"
        description="A single English archive that merges dreams, moods, and summaries into one list."
      />

      <Card title="Archive list">
        <div className="list-stack">
          {mergedItems.map((item, index) => (
            <button
              key={`${item.type}-${index}`}
              type="button"
              className="archive-item"
              onClick={() => {
                if (item.type === "dream") {
                  setSelectedDreamId(String(item.dreamRecordId));
                  navigate("result");
                } else if (item.type === "summary") {
                  setSelectedSummaryData(JSON.stringify(item));
                  navigate("summary");
                }
              }}
            >
              <div className="archive-item-top">
                <strong>
                  {item.type === "dream"
                    ? item.autoTitle || "Dream record"
                    : item.type === "mood"
                      ? `${item.moodType} · ${item.moodIntensity}/5`
                      : "Daily summary"}
                </strong>
                <span className="badge subtle">{item.type}</span>
              </div>
              <p>
                {item.type === "dream"
                  ? item.summary
                  : item.type === "mood"
                    ? item.moodReason || "Mood record"
                    : item.reminder}
              </p>
            </button>
          ))}
          {!mergedItems.length ? <p className="content-copy">No history records yet.</p> : null}
        </div>
      </Card>
    </>
  );
}
