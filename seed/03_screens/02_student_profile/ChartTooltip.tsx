export function ChartTooltip({
  id,
  x,
  y,
  width,
  height,
  title,
  body,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  body: string;
}) {
  const ratio = x / width;
  const shiftX = ratio < 0.25 ? "0" : ratio > 0.75 ? "-100%" : "-50%";
  return (
    <div
      id={id}
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-[16rem] px-3 py-2 text-xs"
      style={{
        left: `${ratio * 100}%`,
        top: `${(y / height) * 100}%`,
        transform: `translate(${shiftX}, calc(-100% - 12px))`,
        background: "var(--surface-card)",
        border: "var(--border-width) solid var(--line)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-popover)",
        color: "var(--ink)",
      }}
    >
      <p className="font-semibold">{title}</p>
      <p style={{ color: "var(--ink-soft)" }}>{body}</p>
    </div>
  );
}
