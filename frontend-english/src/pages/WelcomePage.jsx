import { PrimaryButton, SecondaryButton } from "../components/ui.jsx";

const slides = [
  {
    eyebrow: "Welcome",
    title: "Start by noticing what today feels like.",
    description: "Dream notes, mood snapshots, and daily reflections live in the same quiet line.",
    highlights: ["Dream notes", "Mood snapshots", "Daily summary"],
  },
  {
    eyebrow: "Capture Signals",
    title: "Track dreams and moods together, and the context gets clearer.",
    description: "Keep entries short, stay low pressure, and let the pattern build over time.",
    highlights: ["Fast input", "Clear structure", "Low pressure"],
  },
  {
    eyebrow: "Build A Record",
    title: "The more you log, the more your emotional rhythm takes shape.",
    description: "History, summaries, and trends slowly turn into a personal archive you can actually read.",
    highlights: ["Trends", "Archive", "Patterns"],
  },
];

export default function WelcomePage({ step, setStep, onFinish }) {
  const current = slides[step];
  const isLastStep = step === slides.length - 1;

  return (
    <section className={`english-welcome english-welcome-step-${step + 1}`.trim()}>
      <div className="english-welcome-inner">
        <div className="english-welcome-copy">
          <div className="english-welcome-lockup">
            <span className="english-welcome-tagline">English workspace for dreams and moods</span>
            <span className="english-welcome-name">MYDREAM</span>
          </div>

          <div className="english-welcome-progress">
            {slides.map((item, index) => (
              <span key={item.title} className={`english-welcome-progress-pill ${index === step ? "active" : ""}`} />
            ))}
          </div>

          <div className="english-welcome-step-line">
            <span>{current.eyebrow}</span>
            <strong>{step + 1} / {slides.length}</strong>
          </div>

          <h1 className="english-welcome-title">{current.title}</h1>
          <p className="english-welcome-description">{current.description}</p>

          <div className="english-welcome-actions">
            {step > 0 ? (
              <SecondaryButton onClick={() => setStep((value) => value - 1)}>Back</SecondaryButton>
            ) : (
              <SecondaryButton onClick={onFinish}>Skip</SecondaryButton>
            )}

            <PrimaryButton onClick={() => (isLastStep ? onFinish() : setStep((value) => value + 1))}>
              {isLastStep ? "Enter dashboard" : "Next"}
            </PrimaryButton>
          </div>
        </div>

        <div className="english-welcome-scene" aria-hidden="true">
          <div className="english-welcome-scene-kicker">Quiet onboarding</div>
          <div className="english-welcome-scene-word">MYDREAM</div>

          <div className="english-welcome-scene-card">
            <span>Now showing</span>
            <strong>{current.eyebrow}</strong>
            <p>{current.description}</p>
          </div>

          <div className="english-welcome-highlight-list">
            {current.highlights.map((item) => (
              <div key={item} className="english-welcome-highlight-item">
                <span>Focus</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
