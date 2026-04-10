import { useEffect, useState } from "react";

import { createFeedback, fetchDreamDetail, submitFollowup } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

export default function ResultPage({ token, openLogin, selectedDreamId, showToast }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    detail: null,
    answer: "",
    followupLoading: false,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: "NOT_LOGIN", detail: null }));
        }
        return;
      }
      if (!selectedDreamId) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: "NO_ID", detail: null }));
        }
        return;
      }

      try {
        const detail = await fetchDreamDetail(token, selectedDreamId);
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: "", detail }));
        }
      } catch (error) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: error.message, detail: null }));
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token, selectedDreamId]);

  if (state.loading) {
    return <LoadingBlock title="Loading interpretation" description="Fetching the latest dream result." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view dream results" : "Dream result unavailable"}
        description={state.error === "NO_ID" ? "Open a dream result from the dashboard or history first." : state.error}
        actionText={state.error === "NOT_LOGIN" ? "Open login" : undefined}
        onAction={openLogin}
      />
    );
  }

  const detail = state.detail || {};
  const baseInterpretation = detail.baseInterpretation || {};

  return (
    <>
      <PageHeader
        title="Dream Result"
        description="This page reads the same backend dream detail endpoint and follow-up flow as your current product."
      />

      <Card title={detail.autoTitle || "Latest dream interpretation"} subtitle={detail.createdAt}>
        <p className="content-copy">{detail.summary || "No summary available."}</p>
      </Card>

      <div className="page-grid">
        <Card title="Conclusion">
          <p className="content-copy">{baseInterpretation.conclusion || "No conclusion generated."}</p>
        </Card>
        <Card title="Signals">
          <p className="content-copy">{baseInterpretation.symbols || "No signal block generated."}</p>
        </Card>
        <Card title="Mapping" className="wide-card">
          <p className="content-copy">{baseInterpretation.mapping || "No mapping generated."}</p>
        </Card>
        <Card title="Reminder">
          <p className="content-copy">{baseInterpretation.reminder || "No reminder generated."}</p>
        </Card>
        <Card title="Good for">
          <ul className="bullet-list">{(baseInterpretation.goodFor || []).map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
      </div>

      <Card title="Follow-up" subtitle={detail.followupQuestion || "Ask one more question for extra context."}>
        <textarea
          className="textarea"
          value={state.answer}
          onChange={(event) => setState((prev) => ({ ...prev, answer: event.target.value }))}
          placeholder="What feels most unresolved in real life right now?"
        />
        <div className="button-row">
          <PrimaryButton
            onClick={async () => {
              if (!state.answer.trim()) {
                showToast("Please write an answer before submitting.");
                return;
              }
              setState((prev) => ({ ...prev, followupLoading: true }));
              try {
                await submitFollowup(token, {
                  dreamRecordId: Number(selectedDreamId),
                  followupQuestion: detail.followupQuestion,
                  userAnswer: state.answer.trim(),
                });
                showToast("Follow-up submitted.");
              } catch (error) {
                showToast(error.message);
              } finally {
                setState((prev) => ({ ...prev, followupLoading: false }));
              }
            }}
            disabled={state.followupLoading}
          >
            {state.followupLoading ? "Submitting..." : "Submit follow-up"}
          </PrimaryButton>
          <SecondaryButton
            onClick={async () => {
              try {
                await createFeedback(token, {
                  targetType: "dream",
                  targetId: Number(selectedDreamId),
                  feedbackType: "like",
                  content: "Liked from the English frontend.",
                });
                showToast("Feedback recorded.");
              } catch (error) {
                showToast(error.message);
              }
            }}
          >
            Like result
          </SecondaryButton>
        </div>
      </Card>
    </>
  );
}
