import { Card, PageHeader, PrimaryButton, SecondaryButton } from "../components/ui.jsx";

export default function JournalPage({ navigate }) {
  return (
    <>
      <PageHeader
        title="Journal"
        description="Use this hub to decide whether you want to capture a dream, a mood, or today's summary first."
      />

      <div className="page-grid">
        <Card title="Dream log" subtitle="Capture a dream scene, the feeling after waking up, and visible symbols.">
          <p className="content-copy">
            This route is built for quick dream notes and immediate interpretation output.
          </p>
          <PrimaryButton onClick={() => navigate("dream")}>Open dream form</PrimaryButton>
        </Card>

        <Card title="Mood log" subtitle="Save a mood snapshot with intensity, tags, and context.">
          <p className="content-copy">
            Multiple mood entries per day are supported, so emotional shifts can be tracked across the day.
          </p>
          <PrimaryButton onClick={() => navigate("mood")}>Open mood form</PrimaryButton>
        </Card>

        <Card title="Daily summary" subtitle="Read or regenerate the latest daily summary and care suggestions." className="wide-card">
          <p className="content-copy">
            Today's summary is automatically refreshed whenever you add a new dream or mood record.
          </p>
          <div className="button-row">
            <PrimaryButton onClick={() => navigate("summary")}>Open summary</PrimaryButton>
            <SecondaryButton onClick={() => navigate("trend")}>Open trends</SecondaryButton>
          </div>
        </Card>
      </div>
    </>
  );
}
