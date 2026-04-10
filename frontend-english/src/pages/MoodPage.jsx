import { useEffect, useState } from "react";

import { createMoodRecord, fetchMoodList } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader, PrimaryButton } from "../components/ui.jsx";

const moodOptions = ["Joy", "Calm", "Anxiety", "Tired", "Sadness", "Irritation", "Confusion"];
const tagOptions = ["Work", "Relationship", "Family", "Sleep", "Health", "Social", "Study", "Other"];

function toggleItem(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function MoodPage({ token, openLogin, showToast }) {
  const [moodType, setMoodType] = useState("Calm");
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [moodReason, setMoodReason] = useState("");
  const [moodTags, setMoodTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [recentState, setRecentState] = useState({ loading: true, error: "", list: [] });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setRecentState({ loading: false, error: "NOT_LOGIN", list: [] });
        }
        return;
      }

      try {
        const data = await fetchMoodList(token, 1, 8);
        if (active) {
          setRecentState({ loading: false, error: "", list: data.list || [] });
        }
      } catch (error) {
        if (active) {
          setRecentState({ loading: false, error: error.message, list: [] });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token, saving]);

  const handleSubmit = async () => {
    if (!token) {
      openLogin();
      return;
    }

    setSaving(true);
    try {
      await createMoodRecord(token, {
        moodType,
        moodIntensity,
        moodReason: moodReason.trim() || null,
        moodTags,
      });
      setMoodReason("");
      setMoodTags([]);
      showToast("Mood entry saved. Today's summary was refreshed.");
    } catch (error) {
      showToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Mood Log"
        description="Capture a quick emotional snapshot. Each new mood entry refreshes today's summary in the backend."
      />

      <div className="page-grid">
        <Card title="Current mood">
          <div className="chip-wrap">
            {moodOptions.map((item) => (
              <button key={item} type="button" className={`chip ${moodType === item ? "active" : ""}`} onClick={() => setMoodType(item)}>
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Intensity">
          <input className="range-input" type="range" min="1" max="5" value={moodIntensity} onChange={(event) => setMoodIntensity(Number(event.target.value))} />
          <div className="card-subtitle">Current intensity: {moodIntensity} / 5</div>
        </Card>

        <Card title="Tags" className="wide-card">
          <div className="chip-wrap">
            {tagOptions.map((item) => (
              <button key={item} type="button" className={`chip ${moodTags.includes(item) ? "active" : ""}`} onClick={() => setMoodTags(toggleItem(moodTags, item))}>
                {item}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Context">
        <textarea
          className="textarea"
          value={moodReason}
          onChange={(event) => setMoodReason(event.target.value)}
          placeholder="Why does this feeling stand out right now?"
        />
        <div className="button-row">
          <PrimaryButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save mood entry"}
          </PrimaryButton>
        </div>
      </Card>

      {recentState.loading ? <LoadingBlock title="Loading recent moods" /> : null}

      {!recentState.loading && recentState.error === "NOT_LOGIN" ? (
        <EmptyState
          title="Sign in to log moods"
          description="The mood page needs a valid token before it can save or read records."
          actionText="Open login"
          onAction={openLogin}
        />
      ) : null}

      {!recentState.loading && !recentState.error ? (
        <Card title="Recent entries" subtitle="The newest eight mood records for the current account.">
          <div className="list-stack">
            {recentState.list.map((item) => (
              <div key={item.moodRecordId} className="list-row">
                <strong>{item.moodType}</strong>
                <span>{item.moodIntensity} / 5</span>
                <p>{item.moodReason || "No reason added."}</p>
              </div>
            ))}
            {!recentState.list.length ? <p className="content-copy">No mood entries yet.</p> : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}
