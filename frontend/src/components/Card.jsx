export default function Card({ title, children, className = "" }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title ? (
        <div className="card-head">
          <h3 className="card-title">{title}</h3>
        </div>
      ) : null}
      {children}
    </section>
  );
}
