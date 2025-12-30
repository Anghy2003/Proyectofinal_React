// src/pages/Dashboard.tsx
import "../styles/dashboard.css";

import logoSafeZone from "../assets/logo_naranja.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import IncidentHeatmap from "../components/incidentemap";
import { dashboardService, type DashboardKpis } from "../services/dashboardService";
import type { IncidenteResponseDTO } from "../services/incidentesService";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";

  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace 1 min";
  if (min < 60) return `hace ${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;

  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function getInitials(name?: string) {
  const s = (name || "").trim();
  if (!s) return "SZ";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function getSessionUser(): SessionUser {
  const candidates = ["usuario", "user", "authUser", "safezone_user", "sessionUser"];
  for (const k of candidates) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      return {
        nombre: obj?.nombre ?? obj?.name ?? obj?.fullName,
        rol: obj?.rol ?? obj?.role ?? "Admin",
        fotoUrl: obj?.fotoUrl ?? obj?.foto ?? obj?.photoURL ?? obj?.avatarUrl,
        email: obj?.email,
      };
    } catch {
      // ignore parse error
    }
  }
  return { nombre: "Equipo SafeZone", rol: "Admin" };
}

function priorityBadge(i: IncidenteResponseDTO) {
  const anyI = i as any;
  const p = (
    anyI.prioridad ??
    anyI.nivel ??
    anyI.severidad ??
    anyI.aiPrioridad ??
    anyI.aiSeveridad ??
    anyI.aiNivel ??
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (p.includes("crit")) return { label: "Crítica", cls: "pill-badge badge-crit" };
  if (p.includes("alta") || p.includes("high")) return { label: "Alta", cls: "pill-badge badge-high" };
  if (p.includes("media") || p.includes("mid")) return { label: "Media", cls: "pill-badge badge-med" };
  return { label: "Baja", cls: "pill-badge badge-low" };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  const [me, setMe] = useState<SessionUser>(() => getSessionUser());

  const handleLogout = () => navigate("/login");

  async function cargarDashboard() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await dashboardService.cargar();
      setIncidentes(data.incidentes);
      setKpis(data.kpis);
      setMe(getSessionUser());
    } catch (e: any) {
      console.error("Error cargando dashboard:", e);
      setErrorMsg(e?.message || "No se pudo cargar el dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  const alertas = useMemo(() => kpis?.ultimasAlertas ?? [], [kpis]);

  const heroText = useMemo(() => {
    const pct = (kpis as any)?.mejoraResolucionPct ?? 0;
    if (!pct) return "Las alertas se están resolviendo con un mejor rendimiento que la semana pasada.";
    if (pct > 0) return `Las alertas se están resolviendo un ${pct}% más rápido que la semana pasada.`;
    return `Las alertas se están resolviendo un ${Math.abs(pct)}% más lento que la semana pasada.`;
  }, [kpis]);

  return (
    <>
      {/* Fondo tipo login */}
      <div className="background" />

      <div className="dashboard">
        {/* ========== SIDEBAR (estructura del segundo, estilo del primero) ========== */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logoSafeZone} alt="SafeZone" className="sidebar-logo" />
            <div className="sidebar-title">SafeZone Admin</div>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className="sidebar-item active">
              <img src={iconDashboard} className="nav-icon" alt="Panel" />
              <span>Panel</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item">
              <img src={iconComu} className="nav-icon" alt="Comunidades" />
              <span>Comunidades</span>
            </Link>

            <Link to="/usuarios" className="sidebar-item">
              <img src={iconUsuario} className="nav-icon" alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <div className="sidebar-section-label">MANAGEMENT</div>

            <Link to="/analisis" className="sidebar-item">
              <img src={iconIa} className="nav-icon" alt="Alertas" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/reportes" className="sidebar-item">
              <img src={iconRepo} className="nav-icon" alt="Reportes" />
              <span>Reportes</span>
            </Link>

            <Link to="/codigo-acceso" className="sidebar-item">
              <img src={iconAcceso} className="nav-icon" alt="Ajustes" />
              <span>Ajustes</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-connected">
              <div className="sidebar-connected-title">Conectado como</div>
              <div className="sidebar-connected-name">{me?.rol ?? "Admin"}</div>
            </div>

            <button id="btnSalir" className="sidebar-logout" onClick={handleLogout}>
              Salir
            </button>
            <span className="sidebar-version">v1.0 — SafeZone</span>
          </div>
        </aside>

        {/* ========== MAIN ========== */}
        <main className="dashboard-main">
          {/* Topbar tipo chips + usuario */}
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-btn" aria-label="Menú">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <div className="topbar-title">All</div>
            </div>

            <div className="topbar-right">
              <button className="icon-btn" aria-label="Buscar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <button className="icon-btn" aria-label="Notificaciones">
                <span className="notif-dot">{((kpis as any)?.criticas24h ?? 0) > 0 ? "!" : ""}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 17H9m9 0 1-2V11a7 7 0 1 0-14 0v4l1 2h12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="me">
                {me?.fotoUrl ? (
                  <img className="me-avatar" src={me.fotoUrl} alt="Usuario" />
                ) : (
                  <div className="me-avatar me-fallback">{getInitials(me?.nombre)}</div>
                )}
                <div className="me-meta">
                  <div className="me-name">{me?.nombre ?? "Equipo SafeZone"}</div>
                  <div className="me-role">{me?.rol ?? "Admin"}</div>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="top-error">
              <div className="top-error-row">
                <span>{errorMsg}</span>
                <button className="pill pill-outline" onClick={cargarDashboard}>
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* GRID PRINCIPAL 2 COLUMNAS – con tarjetas del nuevo diseño */}
          <div className="dash-layout">
            {/* HERO */}
            <article className="card hero-card">
              <div className="hero-content">
                <h2>
                  Buen trabajo, <span>Equipo SafeZone</span>
                </h2>
                <p>{heroText}</p>

                <button className="btn-primary" onClick={() => navigate("/reportes")}>
                  Ver incidentes en vivo
                </button>
              </div>
            </article>

            {/* ALERTAS CRÍTICAS */}
            <article className="card crit-card">
              <div className="crit-head">IA de priorización</div>
              <div className="crit-title">Alertas críticas</div>
              <div className="crit-num">{isLoading ? "…" : ((kpis as any)?.criticas24h ?? 0)}</div>
              <div className="crit-sub">En las últimas 24 horas</div>
            </article>

            {/* KPIs */}
            <section className="kpi-row">
              <article className="card kpi-card">
                <div className="kpi-title">Alertas totales</div>
                <div className="kpi-value">
                  {isLoading
                    ? "…"
                    : (((kpis as any)?.alertasTotales ?? kpis?.reportesHoy ?? 0) as number).toLocaleString()}
                </div>
                <div className="kpi-mini">
                  <span className="kpi-dot kpi-up" />{" "}
                  <span>{isLoading ? "—" : `${kpis?.usuariosActivos ?? 0} usuarios activos`}</span>
                </div>
                <div className="kpi-spark" />
              </article>

              <article className="card kpi-card">
                <div className="kpi-title">Alertas resueltas</div>
                <div className="kpi-value">
                  {isLoading ? "…" : (((kpis as any)?.alertasResueltas ?? 0) as number).toLocaleString()}
                </div>
                <div className="kpi-mini">
                  <span className="kpi-dot kpi-ok" />{" "}
                  <span>
                    {isLoading
                      ? "—"
                      : `${Math.round(
                          ((((kpis as any)?.alertasResueltas ?? 0) as number) /
                            Math.max(1, (((kpis as any)?.alertasTotales ?? 1) as number))) *
                            100
                        )}% resueltas`}
                  </span>
                </div>
                <div className="kpi-spark" />
              </article>

              <article className="card kpi-card">
                <div className="kpi-title">Alertas falsas (IA)</div>
                <div className="kpi-value">
                  {isLoading
                    ? "…"
                    : (((kpis as any)?.alertasFalsasIA ?? kpis?.falsosIA ?? 0) as number).toLocaleString()}
                </div>
                <div className="kpi-mini">
                  <span className="kpi-dot kpi-warn" /> <span>{isLoading ? "—" : "Revisión recomendada"}</span>
                </div>
                <div className="kpi-spark" />
              </article>
            </section>

            {/* MAPA DE CALOR */}
            <article className="card heat-card">
              <div className="card-head">
                <div>
                  <div className="card-title">Mapa de calor de incidentes</div>
                  <div className="card-sub">Zonas con mayor concentración de emergencias</div>
                </div>

                <div className="tabs">
                  <button className="tab active">Hoy</button>
                  <button className="tab">Últimos 7 días</button>
                  <button className="tab">30 días</button>
                </div>
              </div>

              <div className="heat-wrap">
                <IncidentHeatmap incidentes={incidentes} />
              </div>
            </article>

            {/* ÚLTIMAS ALERTAS */}
            <article className="card last-card">
              <div className="card-head row-between">
                <div className="card-title">Últimas alertas</div>
                <button className="mini-link" onClick={() => navigate("/reportes")}>
                  Ver todas
                </button>
              </div>

              <div className="alerts-list">
                {!isLoading && alertas.length === 0 && <div className="empty">No hay alertas recientes</div>}

                {(alertas ?? []).slice(0, 6).map((i) => {
                  const badge = priorityBadge(i);
                  const tipo = (i as any).tipo || (i as any).aiCategoria || "—";
                  const comu = (i as any).comunidadNombre || "Sin comunidad";
                  const fc = (i as any).fechaCreacion;

                  return (
                    <div
                      className="alert-item"
                      key={String((i as any).id ?? `${fc}-${tipo}-${comu}`)}
                    >
                      <div className="alert-main">
                        <div className="alert-title">{tipo}</div>
                        <div className="alert-sub">
                          {comu} · {timeAgo(fc)}
                        </div>
                      </div>
                      <div className={badge.cls}>{badge.label}</div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        </main>
      </div>
    </>
  );
}
