const items = [
  { key: "dashboard", label: "Dashboard", tag: "01" },
  { key: "journal", label: "Journal", tag: "02" },
  { key: "trend", label: "Trends", tag: "03" },
  { key: "history", label: "History", tag: "04" },
  { key: "membership", label: "Account", tag: "05" },
];

export default function BottomNav({ current, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${current === item.key ? "active" : ""}`}
          onClick={() => onNavigate(item.key)}
        >
          <span className="nav-tag">{item.tag}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
