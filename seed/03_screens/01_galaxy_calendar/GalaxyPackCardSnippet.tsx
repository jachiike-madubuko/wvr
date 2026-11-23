// Snippet for the interest‑group title card (pack chip) on the Galaxy screen
// Source: web/src/components/room/GalaxyHome.tsx (lines ~331‑345)

<div className="wv-pack-chip">
  <div className="wv-pack-chip-title">
    <Link
      href={`/builder?pack=${encodeURIComponent(packId)}`}
      className="wv-pack-chip-body"
      aria-label={`Open the ${pack?.label ?? packId} builder`}
    >
      <span className="wv-dot" style={{ width: 9, height: 9, background: pack?.color }} />
      <span className="wv-pack-chip-name">{pack?.label ?? packId}</span>
      <span className="wv-pack-chip-count">{count} {count === 1 ? "kid" : "kids"}</span>
    </Link>
    <FreshnessMenu
      packId={packId}
      packLabel={pack?.label ?? packId}
      fresh={fresh}
      onConfirm={confirmPack}
    />
  </div>
</div>
