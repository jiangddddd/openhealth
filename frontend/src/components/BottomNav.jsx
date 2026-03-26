const items = [
  { key: "home", label: "首页" },
  { key: "input", label: "记录" },
  { key: "result", label: "结果" },
  { key: "history", label: "历史" },
  { key: "membership", label: "我的" },
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
          {item.label}
        </button>
      ))}
    </nav>
  );
}
