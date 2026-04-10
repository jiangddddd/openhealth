import { useState } from "react";

import { submitDream } from "../services/api.js";
import { Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

const emotionOptions = ["Fear", "Anxiety", "Sadness", "Joy", "Confusion", "Calm", "Unclear"];
const peopleOptions = ["Family", "Friend", "Partner", "Coworker", "Stranger", "No one specific"];
const symbolOptions = ["Rain", "Water", "Falling", "Darkness", "Animal", "Exam", "Road", "Argument", "Past"];

function toggleValue(list, value, multiple = false) {
  if (!multiple) {
    return list.includes(value) ? [] : [value];
  }
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function DreamPage({ token, openLogin, navigate, showToast, setSelectedDreamId }) {
  const [dreamText, setDreamText] = useState("");
  const [emotion, setEmotion] = useState([]);
  const [people, setPeople] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      openLogin();
      return;
    }
    if (dreamText.trim().length < 10) {
      showToast("Please write at least 10 characters about the dream.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitDream(token, {
        dreamText: dreamText.trim(),
        emotionAfterWaking: emotion[0] || null,
        dreamPeople: people,
        dreamSymbols: symbols,
      });
      setSelectedDreamId(String(result.dreamRecordId));
      showToast("Dream submitted. Opening the latest interpretation.");
      navigate("result");
    } catch (error) {
      showToast(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Dream Log"
        description="Write the scenes, people, and feeling you still remember. The backend will interpret it using the existing APIs."
      />

      <Card title="Dream description" subtitle="Short, imperfect notes are fine.">
        <textarea
          className="textarea"
          value={dreamText}
          onChange={(event) => setDreamText(event.target.value)}
          placeholder="I kept walking through unfamiliar streets and could not find the place I was looking for..."
        />
      </Card>

      <div className="page-grid">
        <Card title="Feeling after waking up">
          <div className="chip-wrap">
            {emotionOptions.map((item) => (
              <button key={item} type="button" className={`chip ${emotion.includes(item) ? "active" : ""}`} onClick={() => setEmotion(toggleValue(emotion, item))}>
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card title="People in the dream">
          <div className="chip-wrap">
            {peopleOptions.map((item) => (
              <button key={item} type="button" className={`chip ${people.includes(item) ? "active" : ""}`} onClick={() => setPeople(toggleValue(people, item, true))}>
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Key symbols" className="wide-card">
          <div className="chip-wrap">
            {symbolOptions.map((item) => (
              <button key={item} type="button" className={`chip ${symbols.includes(item) ? "active" : ""}`} onClick={() => setSymbols(toggleValue(symbols, item, true))}>
                {item}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="button-row">
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Interpret dream"}
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate("journal")}>Back to journal</SecondaryButton>
        </div>
      </Card>

      {!token ? (
        <EmptyState
          title="Login required"
          description="This page posts to the live backend, so you need to sign in before submitting a dream."
          actionText="Open login"
          onAction={openLogin}
        />
      ) : null}
    </>
  );
}
