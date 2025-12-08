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

type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

type Reporte = {
  id: string;
  usuario: string;
  tipo: string;
  comunidad: string;
  fecha: string;
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

export default function Reportes() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aquí luego limpiamos sesión/token
    navigate("/");
  };

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
              <img
                src={iconDashboard}
                className="nav-icon"
                alt="Dashboard"
              />
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

            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card">
                <span className="kpi-label">Total Reportes</span>
                <span className="kpi-value">{reportesMock.length}</span>
              </div>

              {/* Puedes añadir más KPIs luego */}
            </div>

            {/* Filtros tipo "pill" */}
            <div className="filters-row">
              <button className="filter-pill">Tipo de reporte</button>
              <button className="filter-pill">Estado</button>
              <button className="filter-pill">Comunidad</button>
              <button className="filter-pill">dd/mm/aaaa</button>
            </div>

            {/* Tabla principal */}
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
                    {reportesMock.map((reporte) => (
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
                          <button className="icon-button">
                            <img src={iconEdit} alt="Editar" />
                          </button>
                          <button className="icon-button">
                            <img src={iconEliminar} alt="Eliminar" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="panel-update">
              Última actualización: 09/11/2025, 10:20
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
