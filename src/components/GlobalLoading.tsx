import { createContext, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type GlobalLoadingCtx = {
  start: () => void;
  stop: () => void;
  isLoading: boolean;
};

const Ctx = createContext<GlobalLoadingCtx | null>(null);

export function useGlobalLoading() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  return v;
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const api = useMemo(
    () => ({
      start: () => setCount((c) => c + 1),
      stop: () => setCount((c) => Math.max(0, c - 1)),
      isLoading: count > 0,
    }),
    [count],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <GlobalLoadingOverlay open={api.isLoading} />
    </Ctx.Provider>
  );
}

function GlobalLoadingOverlay({ open }: { open: boolean }) {
  if (!open) return null;

  return createPortal(
    <div className="gl-backdrop" role="alert" aria-live="polite" aria-busy="true">
      <div className="gl-modal" role="dialog" aria-label="Cargando">
        <div className="gl-spinner" />
        <div className="gl-text">Cargando…</div>
      </div>
    </div>,
    document.body,
  );
}
