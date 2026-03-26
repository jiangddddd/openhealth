import Button from "./Button.jsx";
import Card from "./Card.jsx";

export default function EmptyState({ title, description, buttonText, onAction }) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {buttonText ? <Button onClick={onAction}>{buttonText}</Button> : null}
    </Card>
  );
}
