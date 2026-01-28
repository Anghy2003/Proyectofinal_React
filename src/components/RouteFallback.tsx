export default function RouteFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.22)",
        backdropFilter: "blur(8px)",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div style={{ color: "#fff", fontWeight: 800 }}>Cargando…</div>
    </div>
  );
}
