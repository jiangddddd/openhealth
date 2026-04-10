import { Card, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

const slides = [
  {
    eyebrow: "Welcome",
    title: "Start by noticing how you feel today.",
    description: "Record dreams, moods, and daily reflections in one quiet space.",
    highlights: ["Dream notes", "Mood snapshots", "Daily summary"],
  },
  {
    eyebrow: "Capture Signals",
    title: "Dreams and moods become clearer when you track them together.",
    description: "Use short entries, keep the pressure low, and let the patterns emerge over time.",
    highlights: ["Low pressure", "Clear structure", "Fast input"],
  },
  {
    eyebrow: "Build A Record",
    title: "The more you log, the more your emotional rhythm takes shape.",
    description: "Your history, summary, and trend pages will gradually turn into a personal emotional archive.",
    highlights: ["Trends", "Archive", "Patterns"],
  },
];

export default function WelcomePage({ step, setStep, onFinish }) {
  const current = slides[step];
  const isLastStep = step === slides.length - 1;

  return (
    <div className="welcome-shell">
      <Card className="hero-card welcome-card">
        <div className="step-row">
          {slides.map((item, index) => (
            <span key={item.title} className={`step-pill ${index === step ? "active" : ""}`} />
          ))}
        </div>
        <div className="welcome-layout">
          <div>
            <div className="page-eyebrow">{current.eyebrow}</div>
            <h1 className="welcome-title">{current.title}</h1>
            <p className="welcome-description">{current.description}</p>
            <div className="welcome-chip-row">
              {current.highlights.map((item) => (
                <span key={item} className="welcome-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className={`welcome-visual welcome-visual-${step + 1}`}>
            <div className="welcome-glow" />
            <div className="welcome-panel">
              <span className="welcome-panel-label">MyDream English</span>
              <strong>{current.eyebrow}</strong>
              <p>{current.description}</p>
            </div>
          </div>
        </div>
        <div className="button-row">
          {step > 0 ? (
            <SecondaryButton onClick={() => setStep((value) => value - 1)}>Back</SecondaryButton>
          ) : (
            <SecondaryButton onClick={onFinish}>Skip</SecondaryButton>
          )}
          <PrimaryButton onClick={() => (isLastStep ? onFinish() : setStep((value) => value + 1))}>
            {isLastStep ? "Enter dashboard" : "Next"}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
