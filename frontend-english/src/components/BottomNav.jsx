const items = [
  { key: "dashboard", label: "Dashboard", tag: "Now" },
  { key: "journal", label: "Logbook", tag: "Log" },
  { key: "trend", label: "Trends", tag: "Map" },
  { key: "history", label: "Archive", tag: "Past" },
  { key: "membership", label: "Account", tag: "Me" },
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
