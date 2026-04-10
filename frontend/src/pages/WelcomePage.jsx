import { useMemo, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import { onboardingSlides } from "../content/onboardingSlides.js";

export default function WelcomePage({ onFinish }) {
  const [step, setStep] = useState(0);
  const current = useMemo(() => onboardingSlides[step], [step]);
  const isLast = step === onboardingSlides.length - 1;
  const secondaryText = step > 0 ? "上一步" : "先去首页看看";
  const primaryText = isLast ? "去首页开始记录" : "继续看看";

  return (
    <div className="welcome-shell">
      <Card className="welcome-card">
        <div className="welcome-progress">
          {onboardingSlides.map((item, index) => (
            <div key={item.title} className={`welcome-progress-dot ${index === step ? "active" : ""}`} />
          ))}
        </div>

        <div className="welcome-copy">
          <div className="section-eyebrow">{current.eyebrow}</div>
          <h1 className="welcome-title">{current.title}</h1>
          <p className="welcome-desc">{current.description}</p>
        </div>

        <div className="welcome-visual">
          <div className={`welcome-orb welcome-orb-${step + 1}`} />
          <div className="welcome-chip-row">
            {current.chips.map((item) => (
              <span key={item} className="hero-keyword">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="welcome-note-list">
          {current.notes.map((item) => (
            <div key={item} className="welcome-note-item">
              {item}
            </div>
          ))}
        </div>

        <div className="helper-text">看完这几页，你就可以开始记录今天的梦境和心情了。</div>

        <div className="welcome-actions">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((prev) => prev - 1)}>
              {secondaryText}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onFinish}>
              {secondaryText}
            </Button>
          )}

          <Button onClick={() => (isLast ? onFinish() : setStep((prev) => prev + 1))}>
            {primaryText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
