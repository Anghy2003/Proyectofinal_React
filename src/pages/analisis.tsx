// src/pages/Analisis.tsx
import "../styles/analisis.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import {
  incidentesService,
  type IncidenteResponseDTO,
} from "../services/incidentesService";

/* ===================== HELPERS ===================== */
function parseJsonArrayString(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [String(value)];
  }
}

// badge para prioridad IA
type PrioridadIA = "ALTA" | "MEDIA" | "BAJA" | string;

function getBadgePrioridad(prio?: PrioridadIA | null): string {
  const p = (prio ?? "").toString().toUpperCase();
  if (p === "ALTA") return "badge badge-bad";
  if (p === "MEDIA") return "badge badge-warning";
  if (p === "BAJA") return "badge badge-ok";
  return "badge"; // neutro
}

// helper para comparar fecha del filtro (yyyy-mm-dd) con fechaCreacion ISO
function isoToYMD(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Analisis() {
  const navigate = useNavigate();

  // 🔹 DATA REAL (Incidentes con IA)
  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // 🔹 FILTROS estilo Reportes
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("");
  const [filtroFalso, setFiltroFalso] = useState<string>(""); // "", "true", "false"
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  const handleLogout = () => navigate("/login");

  // =====================
  // CARGAR INCIDENTES
  // =====================
  const cargarIncidentes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await incidentesService.listar();
      setIncidentes(data);
    } catch (e: any) {
      setError(e?.message || "Error cargando IA análisis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncidentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 LISTAS ÚNICAS PARA SELECTS (como Reportes)
  const categoriasUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiCategoria)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  const prioridadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiPrioridad)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  const comunidadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.comunidadNombre)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  // 🔹 FILTRADO (como Reportes)
  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter((i) => {
      // si quieres que esta pantalla sea SOLO IA, deja esto activado:
      const tieneIA =
        i.aiCategoria != null ||
        i.aiPrioridad != null ||
        i.aiPosibleFalso != null ||
        i.aiConfianza != null ||
        (i.aiMotivos != null && i.aiMotivos !== "") ||
        (i.aiRiesgos != null && i.aiRiesgos !== "");
      if (!tieneIA) return false;

      if (filtroCategoria && i.aiCategoria !== filtroCategoria) return false;
      if (filtroPrioridad && i.aiPrioridad !== filtroPrioridad) return false;

      if (filtroFalso) {
        const esperado = filtroFalso === "true";
        if (Boolean(i.aiPosibleFalso) !== esperado) return false;
      }

      if (filtroComunidad && i.comunidadNombre !== filtroComunidad) return false;

      if (filtroFecha) {
        const ymd = isoToYMD(i.fechaCreacion);
        if (ymd !== filtroFecha) return false;
      }

      return true;
    });
  }, [incidentes, filtroCategoria, filtroPrioridad, filtroFalso, filtroComunidad, filtroFecha]);

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
            <Link to="/dashboard" className="sidebar-item">
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

            <Link to="/analisis" className="sidebar-item active">
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

        {/* ===== CONTENIDO PRINCIPAL (igual a Reportes) ===== */}
        <main className="reportes-main">
          <section className="reportes-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 className="panel-title">IA Análisis</h1>

              <button
                className="filter-pill"
                style={{ cursor: "pointer" }}
                onClick={cargarIncidentes}
                disabled={loading}
                title="Recargar"
              >
                {loading ? "Cargando..." : "Recargar"}
              </button>
            </div>

            {/* Mensajes */}
            {error && (
              <div style={{ padding: "10px 0", color: "tomato" }}>
                {error}
              </div>
            )}

            {/* KPI (igual estilo) */}
            <div className="kpi-row">
              <div className="kpi-card">
                <span className="kpi-label">Incidentes analizados</span>
                <span className="kpi-value">{incidentesFiltrados.length}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Prioridad ALTA</span>
                <span className="kpi-value kpi-bad">
                  {incidentesFiltrados.filter((x) => (x.aiPrioridad ?? "").toUpperCase() === "ALTA").length}
                </span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Prioridad MEDIA</span>
                <span className="kpi-value kpi-warning">
                  {incidentesFiltrados.filter((x) => (x.aiPrioridad ?? "").toUpperCase() === "MEDIA").length}
                </span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Posibles falsos</span>
                <span className="kpi-value kpi-warning">
                  {incidentesFiltrados.filter((x) => x.aiPosibleFalso === true).length}
                </span>
              </div>
            </div>

            {/* FILTROS (pills) */}
            <div className="filters-row">
              <select
                className="filter-pill"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Categoría IA</option>
                {categoriasUnicas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="filter-pill"
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
              >
                <option value="">Prioridad IA</option>
                {prioridadesUnicas.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                className="filter-pill"
                value={filtroFalso}
                onChange={(e) => setFiltroFalso(e.target.value)}
              >
                <option value="">¿Posible falso?</option>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>

              <select
                className="filter-pill"
                value={filtroComunidad}
                onChange={(e) => setFiltroComunidad(e.target.value)}
              >
                <option value="">Comunidad</option>
                {comunidadesUnicas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="date"
                className="filter-pill filter-date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            {/* TABLA (mismo contenedor) */}
            <section className="tabla-panel">
              <div className="tabla-inner">
                <table className="tabla-reportes">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Comunidad</th>
                      <th>Categoría IA</th>
                      <th>Prioridad</th>
                      <th>Confianza</th>
                      <th>Falso</th>
                      <th>Motivos</th>
                      <th>Riesgos</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "14px" }}>
                          Cargando análisis IA...
                        </td>
                      </tr>
                    ) : incidentesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "14px" }}>
                          No se encontraron incidentes con IA.
                        </td>
                      </tr>
                    ) : (
                      incidentesFiltrados.map((i) => {
                        const motivos = parseJsonArrayString(i.aiMotivos);
                        const riesgos = parseJsonArrayString(i.aiRiesgos);

                        return (
                          <tr key={i.id}>
                            <td>{i.id}</td>
                            <td>{i.usuarioNombre ?? "-"}</td>
                            <td>{i.comunidadNombre ?? "-"}</td>
                            <td>{i.aiCategoria ?? "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className={getBadgePrioridad(i.aiPrioridad)}>
                                {i.aiPrioridad ?? "-"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {i.aiConfianza == null ? "-" : i.aiConfianza.toFixed(2)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={i.aiPosibleFalso ? "badge badge-warning" : "badge badge-ok"}>
                                {i.aiPosibleFalso ? "Sí" : "No"}
                              </span>
                            </td>

                            <td className="cell-wrap">
                              {motivos.length === 0 ? "-" : (
                                <ul className="mini-list">
                                  {motivos.slice(0, 3).map((m, idx) => <li key={idx}>{m}</li>)}
                                  {motivos.length > 3 && <li>+{motivos.length - 3} más...</li>}
                                </ul>
                              )}
                            </td>

                            <td className="cell-wrap">
                              {riesgos.length === 0 ? "-" : (
                                <ul className="mini-list">
                                  {riesgos.slice(0, 3).map((r, idx) => <li key={idx}>{r}</li>)}
                                  {riesgos.length > 3 && <li>+{riesgos.length - 3} más...</li>}
                                </ul>
                              )}
                            </td>

                            <td>{isoToYMD(i.fechaCreacion) || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="panel-update">
              Última actualización: {new Date().toLocaleString()}
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
