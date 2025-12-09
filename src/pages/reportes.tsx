import "../styles/reporte.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEdit from "../assets/icon_edit.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";   // 👈 NUEVO

type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

type Reporte = {
  id: string;
  usuario: string;
  tipo: string;
  comunidad: string;
  fecha: string;      // dd/mm/aaaa
  ubicacion: string;
  estado: EstadoReporte;
};

const reportesMock: Reporte[] = [
  {
    id: "RPT-11",
    usuario: "Kevin Moscoso",
    tipo: "Robo",
    comunidad: "Parque Industrial",
    fecha: "07/11/2025",
    ubicacion: "Parque Industrial",
    estado: "Atendido",
  },
  {
    id: "RPT-12",
    usuario: "Andres Illescas",
    tipo: "Incendio",
    comunidad: "Milchichig",
    fecha: "08/11/2025",
    ubicacion: "Milchichig",
    estado: "Pendiente",
  },
  {
    id: "RPT-13",
    usuario: "Samy López",
    tipo: "Accidente",
    comunidad: "Quinta Chica",
    fecha: "08/11/2025",
    ubicacion: "Quinta Chica",
    estado: "Falso positivo",
  },
];

function getBadgeClass(estado: EstadoReporte): string {
  if (estado === "Atendido") return "badge badge-ok";
  if (estado === "Pendiente") return "badge badge-warning";
  return "badge badge-bad";
}

// 👇 helper para comparar fecha del filtro con la del reporte
function fechaToISO(fechaDDMMYYYY: string): string {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export default function Reportes() {
  const navigate = useNavigate();

  // 🔹 ESTADOS DE LOS FILTROS
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  const handleLogout = () => {
    navigate("/");
  };

  // 🔹 LISTAS ÚNICAS PARA LOS SELECT
  const tiposUnicos = Array.from(new Set(reportesMock.map((r) => r.tipo)));
  const estadosUnicos = Array.from(new Set(reportesMock.map((r) => r.estado)));
  const comunidadesUnicas = Array.from(
    new Set(reportesMock.map((r) => r.comunidad))
  );

  // 🔹 APLICAR FILTROS
  const reportesFiltrados = reportesMock.filter((r) => {
    if (filtroTipo && r.tipo !== filtroTipo) return false;
    if (filtroEstado && r.estado !== filtroEstado) return false;
    if (filtroComunidad && r.comunidad !== filtroComunidad) return false;

    if (filtroFecha) {
      const fechaReporteISO = fechaToISO(r.fecha); // dd/mm/yyyy -> yyyy-mm-dd
      if (fechaReporteISO !== filtroFecha) return false;
    }

    return true;
  });

  return (
    <>
      <div className="background" />

      <div className="dashboard">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img
              src={logoSafeZone}
              alt="SafeZone"
              className="sidebar-logo"
            />
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

            <Link to="/reportes" className="sidebar-item active">
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
            <button
              id="btnSalir"
              className="sidebar-logout"
              onClick={handleLogout}
            >
              Salir
            </button>
            <span className="sidebar-version">v1.0 - SafeZone</span>
          </div>
        </aside>

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <main className="reportes-main">
          <section className="reportes-panel">
            <h1 className="panel-title">Reportes Recientes</h1>

            {/* KPI */}
            <div className="kpi-row">
              <div className="kpi-card">
                <span className="kpi-label">Total Reportes</span>
                <span className="kpi-value">{reportesFiltrados.length}</span>
              </div>
            </div>

            {/* FILTROS */}
            <div className="filters-row">
              {/* Tipo de reporte */}
              <select
                className="filter-pill"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Tipo de reporte</option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              {/* Estado */}
              <select
                className="filter-pill"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Estado</option>
                {estadosUnicos.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              {/* Comunidad */}
              <select
                className="filter-pill"
                value={filtroComunidad}
                onChange={(e) => setFiltroComunidad(e.target.value)}
              >
                <option value="">Comunidad</option>
                {comunidadesUnicas.map((com) => (
                  <option key={com} value={com}>
                    {com}
                  </option>
                ))}
              </select>

              {/* Fecha */}
              <input
                type="date"
                className="filter-pill filter-date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            {/* TABLA */}
            <section className="tabla-panel">
              <div className="tabla-inner">
                <table className="tabla-reportes">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Tipo</th>
                      <th>Comunidad</th>
                      <th>Fecha</th>
                      <th>Ubicación</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "14px" }}>
                          No se encontraron reportes.
                        </td>
                      </tr>
                    ) : (
                      reportesFiltrados.map((reporte) => (
                        <tr key={reporte.id}>
                          <td>{reporte.id}</td>
                          <td>{reporte.usuario}</td>
                          <td>{reporte.tipo}</td>
                          <td>{reporte.comunidad}</td>
                          <td>{reporte.fecha}</td>
                          <td>{reporte.ubicacion}</td>
                          <td>
                            <span className={getBadgeClass(reporte.estado)}>
                              {reporte.estado}
                            </span>
                          </td>
                          <td className="acciones">
                            {/*<button className="icon-button">
                              <img src={iconEdit} alt="Editar" />
                            </button>*/}
                            <button className="icon-button">
                              <img src={iconEliminar} alt="Eliminar" />
                            </button>
                          </td>
                        </tr>
                      ))
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
