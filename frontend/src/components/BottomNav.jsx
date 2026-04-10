const items = [
  { key: "home", label: "首页", glyph: "首" },
  { key: "record", label: "记录", glyph: "记" },
  { key: "trend", label: "趋势", glyph: "势" },
  { key: "history", label: "历史", glyph: "档" },
  { key: "membership", label: "我的", glyph: "我" },
];

export default function BottomNav({ current, onNavigate, className = "" }) {
  return (
    <nav className={`bottom-nav ${className}`.trim()}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${current === item.key ? "active" : ""}`}
          aria-current={current === item.key ? "page" : undefined}
          onClick={() => onNavigate(item.key)}
        >
          <span className="nav-item-glyph" aria-hidden="true">{item.glyph}</span>
          <span className="nav-item-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
