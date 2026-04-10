export default function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}
