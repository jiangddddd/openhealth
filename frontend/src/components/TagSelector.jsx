export default function TagSelector({
  options,
  value,
  onChange,
  multiple = false,
  limit = 1,
}) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (item) => {
    const exists = selected.includes(item);
    let next = [];

    if (multiple) {
      next = exists
        ? selected.filter((current) => current !== item)
        : [...selected, item].slice(0, limit);
    } else {
      next = exists ? [] : [item];
    }

    onChange(next);
  };

  return (
    <div className="chip-row">
      {options.map((item) => (
        <button
          key={item}
          type="button"
          className={`chip ${selected.includes(item) ? "active" : ""}`}
          onClick={() => toggle(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
