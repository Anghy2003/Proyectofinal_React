// src/pages/Dashboard.tsx
import "../styles/dashboard.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHoraFromISO(iso?: string | null) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  // Mostramos hora local del navegador (admin)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function mapEstadoToLabel(estado?: string | null, fechaResolucion?: string | null) {
  const e = (estado || "").toLowerCase().trim();

  // Si ya hay fechaResolucion, prioriza "Atendido"
  if (fechaResolucion) return { label: "Atendido", cls: "status status-ok" };

  if (e === "resuelto" || e === "atendido") return { label: "Atendido", cls: "status status-ok" };
  if (e === "en_curso" || e === "encurso" || e === "proceso" || e === "en proceso")
    return { label: "En curso", cls: "status status-progress" };
  if (e === "pendiente" || e === "nuevo" || e === "reportado") return { label: "Pendiente", cls: "status status-pending" };

  // Fallback
  return { label: estado || "Pendiente", cls: "status status-pending" };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  const handleLogout = () => {
    // Si manejas token en localStorage/sessionStorage, bórralo aquí.
    // localStorage.removeItem("token");
    navigate("/login");
  };

  async function cargarDashboard() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await dashboardService.cargar();
      setIncidentes(data.incidentes);
      setKpis(data.kpis);
    } catch (e: any) {
      console.error("Error cargando dashboard:", e);
      setErrorMsg(e?.message || "No se pudo cargar el dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
    // Si quieres refresco automático:
    // const t = setInterval(cargarDashboard, 30000);
    // return () => clearInterval(t);
  }, []);

  const sla = kpis?.slaPct ?? 0;

  // Rotación del indicador (0..100) -> (aprox) -90..+90 (semicírculo)
  const slaRotationDeg = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, sla));
    return -90 + (clamped * 180) / 100;
  }, [sla]);

  // Nuevos reportes: últimos 3 (para tu tabla inferior derecha)
  const nuevosReportes = useMemo(() => {
    const sorted = [...incidentes]
      .filter((i) => i.fechaCreacion)
      .sort((a, b) => new Date(b.fechaCreacion!).getTime() - new Date(a.fechaCreacion!).getTime());
    return sorted.slice(0, 3);
  }, [incidentes]);

  return (
    <>
      <div className="background" />

      <div className="dashboard">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logoSafeZone} alt="SafeZone" className="sidebar-logo" />
            <div className="sidebar-title">SafeZone Admin</div>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className="sidebar-item active">
              <img src={iconDashboard} className="nav-icon" alt="Dashboard" />
              <span>Dashboard</span>
            </Link>

            <Link to="/usuarios" className="sidebar-item">
              <img src={iconUsuario} alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item">
              <img src={iconComu} alt="Comunidades" />
              <span>Comunidades</span>
            </Link>

            <Link to="/reportes" className="sidebar-item">
              <img src={iconRepo} alt="Reportes" />
              <span>Reportes</span>
            </Link>

            <Link to="/analisis" className="sidebar-item">
              <img src={iconIa} alt="IA Análisis" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/codigo-acceso" className="sidebar-item">
              <img src={iconAcceso} alt="Código Acceso" />
              <span>Código Acceso</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <button id="btnSalir" className="sidebar-logout" onClick={handleLogout}>
              Salir
            </button>
            <span className="sidebar-version">v1.0 - SafeZone</span>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-main">
          {/* Mensaje de estado */}
          {errorMsg && (
            <div style={{ padding: 12, marginBottom: 12, borderRadius: 12, background: "rgba(255,255,255,.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <span>{errorMsg}</span>
                <button className="pill pill-outline" onClick={cargarDashboard}>
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* FILA SUPERIOR: KPIs */}
          <section className="top-cards">
            <article className="card card-kpi">
              <h3>Reportes hoy</h3>
              <p className="kpi-value">{isLoading ? "…" : (kpis?.reportesHoy ?? 0)}</p>
            </article>

            <article className="card card-kpi">
              <h3>Falsos positivos (IA)</h3>
              <p className="kpi-value">{isLoading ? "…" : (kpis?.falsosIA ?? 0)}</p>
              {/* Si quieres variación real (+/-), hay que calcularlo contra periodo anterior */}
              {/* <p className="kpi-sub kpi-warning">+2 casos</p> */}
            </article>

            <article className="card card-sla">
              <header className="card-sla-header">
                <h3 className="card-sla-title">SLA de atención (meta trimestral)</h3>
                <p className="card-sla-subtitle">Objetivo &gt; 80%</p>
              </header>

              <div className="card-sla-body">
                <div className="sla-gauge">
                  <div className="sla-gauge-arc">
                    {/* Indicador dinámico */}
                    <div
                      className="sla-gauge-indicator"
                      style={{
                        transform: `rotate(${slaRotationDeg}deg)`,
                      }}
                      aria-label={`SLA ${sla}%`}
                    />
                  </div>
                  <div className="sla-gauge-center">
                    <span className="sla-gauge-value">{isLoading ? "…" : `${sla}%`}</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="card card-kpi">
              <h3>Usuarios activos</h3>
              <p className="kpi-value">{isLoading ? "…" : (kpis?.usuariosActivos ?? 0)}</p>
            </article>
          </section>

          {/* FILA MEDIA: COMUNIDADES + MAPA */}
          <section className="middle-cards">
            <article className="card card-communities">
              <header className="card-header" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <h3>Comunidades</h3>
                <button className="pill pill-outline" onClick={cargarDashboard} disabled={isLoading}>
                  {isLoading ? "Cargando…" : "Actualizar"}
                </button>
              </header>

              <table className="table">
                <thead>
                  <tr>
                    <th>Comunidad</th>
                    <th>Miembros</th>
                    <th>Activas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (kpis?.topComunidades7d?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ opacity: 0.8 }}>
                        Sin datos de comunidades (últimos 7 días)
                      </td>
                    </tr>
                  )}

                  {(kpis?.topComunidades7d ?? []).map((c) => (
                    <tr key={c.comunidadNombre}>
                      <td>{c.comunidadNombre}</td>
                      {/* No hay miembros en dashboardService -> dejamos placeholder realista */}
                      <td>—</td>
                      <td>
                        <span className="tag">{c.reportes} reportes (7d)</span>
                      </td>
                      <td>
                        <Link to="/comunidades" className="link">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            {/* MAPA DE CALOR */}
            <article className="card card-heatmap">
              <header className="card-header heatmap-header">
                <h3>Mapa de calor de incidentes</h3>
                <span className="heatmap-sub">Zonas con mayor concentración de emergencias</span>
              </header>

              <div className="heatmap-map">
                <IncidentHeatmap />
                <div className="heatmap-filters">
                  <button className="pill">Últimos 7 días</button>
                  <button className="pill pill-outline">Tipo</button>
                  <button className="pill pill-outline">Comunidad</button>
                </div>
              </div>
            </article>
          </section>

          {/* FILA INFERIOR */}
          <section className="bottom-cards">
            <article className="card card-alerts">
              <header className="card-header">
                <h3>Últimas alertas</h3>
              </header>

              <table className="table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Comunidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (kpis?.ultimasAlertas?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ opacity: 0.8 }}>
                        No hay alertas recientes
                      </td>
                    </tr>
                  )}

                  {(kpis?.ultimasAlertas ?? []).map((i) => {
                    const estado = mapEstadoToLabel(i.estado, i.fechaResolucion ?? null);
                    return (
                      <tr key={String(i.id ?? `${i.fechaCreacion}-${i.tipo}-${i.comunidadNombre}`)}>
                        <td>{formatHoraFromISO(i.fechaCreacion)}</td>
                        <td>{i.tipo || i.aiCategoria || "—"}</td>
                        <td>{i.comunidadNombre || "Sin comunidad"}</td>
                        <td className={estado.cls}>{estado.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>

            <article className="card card-top">
              <div className="card-top-col">
                <header className="card-header">
                  <h3>Top comunidades (últimos 7 días)</h3>
                </header>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Comunidad</th>
                      <th>Reportes</th>
                      <th>Var.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isLoading && (kpis?.topComunidades7d?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={3} style={{ opacity: 0.8 }}>
                          Sin datos
                        </td>
                      </tr>
                    )}

                    {(kpis?.topComunidades7d ?? []).map((c) => (
                      <tr key={c.comunidadNombre}>
                        <td>{c.comunidadNombre}</td>
                        <td>{c.reportes}</td>
                        {/* Variación requiere comparar vs periodo anterior (7d previos).
                            Por ahora dejamos "—" para no inventar. */}
                        <td className="var">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-top-col">
                <header className="card-header">
                  <h3>Nuevos reportes</h3>
                </header>

                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Tipo</th>
                      <th>Comunidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isLoading && nuevosReportes.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ opacity: 0.8 }}>
                          Sin reportes recientes
                        </td>
                      </tr>
                    )}

                    {nuevosReportes.map((r) => (
                      <tr key={String(r.id ?? `${r.fechaCreacion}-${r.tipo}`)}>
                        <td>{r.id ? `RPT-${r.id}` : "—"}</td>
                        <td>{(r as any).usuarioNombre || (r as any).usuario?.nombre || "—"}</td>
                        <td>{r.tipo || r.aiCategoria || "—"}</td>
                        <td>{r.comunidadNombre || "Sin comunidad"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </main>
      </div>
    </>
  );
}
