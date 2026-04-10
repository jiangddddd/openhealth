export function PageHeader({ title, description, actions = null }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-eyebrow">MyDream English</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, subtitle, className = "", children }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button type="button" className="button button-primary" {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button type="button" className="button button-secondary" {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ title, description, actionText, onAction }) {
  return (
    <Card className="empty-state">
      <h3 className="card-title">{title}</h3>
      <p className="card-subtitle">{description}</p>
      {actionText ? <PrimaryButton onClick={onAction}>{actionText}</PrimaryButton> : null}
    </Card>
  );
}

export function LoadingBlock({ title = "Loading", description = "Please wait a moment." }) {
  return (
    <Card>
      <div className="loading-row">
        <div className="loading-dot" />
        <div>
          <div className="loading-title">{title}</div>
          <div className="card-subtitle">{description}</div>
        </div>
      </div>
    </Card>
  );
}
