export default function Button({ children, variant = "primary", className = "", ...props }) {
  const variantClass = variant === "secondary" ? "secondary-button" : "primary-button";
  const mergedClassName = `button-base ${variantClass} ${className}`.trim();
  return (
    <button type="button" className={mergedClassName} {...props}>
      {children}
    </button>
  );
}
