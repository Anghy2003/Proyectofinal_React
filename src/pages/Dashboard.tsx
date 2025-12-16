import "../styles/dashboard.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";

import { Link, useNavigate } from "react-router-dom";
import IncidentHeatmap from "../components/incidentemap";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

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

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-main">
          {/* FILA SUPERIOR: KPIs */}
          <section className="top-cards">
            <article className="card card-kpi">
              <h3>Reportes hoy</h3>
              <p className="kpi-value">32</p>
            </article>

            <article className="card card-kpi">
              <h3>Falsos positivos (IA)</h3>
              <p className="kpi-value">4</p>
              <p className="kpi-sub kpi-warning">+2 casos</p>
            </article>

            <article className="card card-sla">
              <header className="card-sla-header">
                <h3 className="card-sla-title">
                  SLA de atención (meta trimestral)
                </h3>
                <p className="card-sla-subtitle">Objetivo &gt; 80%</p>
              </header>
              <div className="card-sla-body">
                <div className="sla-gauge">
                  <div className="sla-gauge-arc">
                    <div className="sla-gauge-indicator"></div>
                  </div>
                  <div className="sla-gauge-center">
                    <span className="sla-gauge-value">84%</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="card card-kpi">
              <h3>Usuarios activos</h3>
              <p className="kpi-value">80</p>
            </article>
          </section>

          {/* FILA MEDIA: COMUNIDADES + MAPA */}
          <section className="middle-cards">
            <article className="card card-communities">
              <header className="card-header">
                <h3>Comunidades</h3>
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
                  <tr>
                    <td>P1&nbsp; Parque-Industrial</td>
                    <td>126</td>
                    <td>
                      <span className="tag">12 reportes / día</span>
                    </td>
                    <td>
                      <a href="#" className="link">
                        Ver
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>F2&nbsp; Milchichig</td>
                    <td>98</td>
                    <td>
                      <span className="tag">8 reportes / día</span>
                    </td>
                    <td>
                      <a href="#" className="link">
                        Ver
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>AZ&nbsp; Quinta Chica</td>
                    <td>143</td>
                    <td>
                      <span className="tag">15 reportes / día</span>
                    </td>
                    <td>
                      <a href="#" className="link">
                        Ver
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </article>

            {/* ✅ REEMPLAZO: MAPA DE CALOR */}
            <article className="card card-heatmap">
              <header className="card-header heatmap-header">
                <h3>Mapa de calor de incidentes</h3>
                <span className="heatmap-sub">
                  Zonas con mayor concentración de emergencias
                </span>
              </header>

              <div className="heatmap-map">
                {/* MAPA REAL (Leaflet + Heat) consumiendo el endpoint mock */}
                <IncidentHeatmap />

                {/* (Opcional) Botones de filtro visuales */}
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
                  <tr>
                    <td>09:21</td>
                    <td>Robo</td>
                    <td>Parque-Industrial</td>
                    <td className="status status-ok">Atendido</td>
                  </tr>
                  <tr>
                    <td>08:57</td>
                    <td>Incendio</td>
                    <td>Milchichig</td>
                    <td className="status status-pending">Pendiente</td>
                  </tr>
                  <tr>
                    <td>08:40</td>
                    <td>Accidente</td>
                    <td>Quinta Chica</td>
                    <td className="status status-progress">En curso</td>
                  </tr>
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
                    <tr>
                      <td>Parque-industrial</td>
                      <td>92</td>
                      <td className="var var-up">+12%</td>
                    </tr>
                    <tr>
                      <td>Milchichig</td>
                      <td>81</td>
                      <td className="var var-down">-4%</td>
                    </tr>
                    <tr>
                      <td>Quinta Chica</td>
                      <td>67</td>
                      <td className="var var-up">+6%</td>
                    </tr>
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
                    <tr>
                      <td>RPT-120</td>
                      <td>Kevin</td>
                      <td>Robo</td>
                      <td>Parque-industrial</td>
                    </tr>
                    <tr>
                      <td>RPT-121</td>
                      <td>Andrea</td>
                      <td>Incendio</td>
                      <td>Milchichig</td>
                    </tr>
                    <tr>
                      <td>RPT-122</td>
                      <td>Samy</td>
                      <td>Accidente</td>
                      <td>Quinta Chica</td>
                    </tr>
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
