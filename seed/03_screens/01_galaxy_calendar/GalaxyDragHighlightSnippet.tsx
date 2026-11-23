// Drag‑and‑drop highlight logic (target‑group highlight while dragging)
// Source: web/src/components/room/GalaxyHome.tsx (lines ~311‑318 and 352‑358)

// Determine whether the dragged student is "in" the pack's top‑5 interests
const fit =
  dragId !== null && hot === packId && dragged
    ? dragged.interests.slice(0, 5).includes(packId)
      ? "in"
      : "out"
    : null;

return (
  <div
    key={packId}
    className="wv-galaxy-cell"
    data-galaxy-cell={packId}
    data-hot-fit={fit ?? undefined}
    style={{
      gridColumn: span.column,
      gridRow: span.row,
      "--orbit-r": `${Math.max(76, 24 * count)}px`,
    } as CSSProperties}
  >
    {/* ...cell contents... */}
    {fit && dragged ? (
      <span className="wv-galaxy-fit" data-fit={fit}>
        {fit === "in"
          ? `In ${dragged.firstName}'s top 5`
          : `Outside ${dragged.firstName}'s top 5`}
      </span>
    ) : null}
  </div>
);
