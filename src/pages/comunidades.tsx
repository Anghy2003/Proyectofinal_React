import "../styles/comunidad.css";

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
import { useEffect, useState } from "react";

// 👉 types solo como type
import type { Comunidad, EstadoComunidad } from "../services/comunidad.Service";
// 👉 función para traer TODAS las comunidades
import { getTodasComunidades } from "../services/comunidad.Service";

export default function Comunidades() {
  const navigate = useNavigate();

  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    // luego aquí limpiamos token / sesión
    navigate("/login");
  };

  // Cargar comunidades del backend
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const data = await getTodasComunidades(); // 👈 ahora usamos el endpoint correcto
        setComunidades(data);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar las comunidades.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  // KPIs
  const totalComunidades = comunidades.length;
  const activasCount = comunidades.filter((c) => c.estado === "ACTIVA").length;
  const inactivasCount = comunidades.filter(
    (c) => c.estado === "RECHAZADA"
  ).length;

  // Filtro por buscador (nombre o código)
  const comunidadesFiltradas = comunidades.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const nombre = c.nombre.toLowerCase();
    const codigo = (c.codigoAcceso ?? "").toLowerCase();

    return nombre.includes(q) || codigo.includes(q);
  });

  const badgeClass = (estado: EstadoComunidad) => {
    if (estado === "ACTIVA") return "badge badge-success";
    if (estado === "RECHAZADA") return "badge badge-danger";
    // SOLICITADA
    return "badge badge-success"; // o crea otra clase si quieres un color distinto
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
            <Link to="/dashboard" className="sidebar-item">
              <img src={iconDashboard} className="nav-icon" alt="Dashboard" />
              <span>Dashboard</span>
            </Link>

            <Link to="/usuarios" className="sidebar-item">
              <img src={iconUsuario} alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item active">
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
        <main className="comunidades-main">
          <div className="comunidades-panel">
            <h1 className="panel-title">Comunidades registradas</h1>

            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card">
                <span className="kpi-label">Total Comunidades</span>
                <span className="kpi-value">{totalComunidades}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Activas</span>
                <span className="kpi-value kpi-ok">{activasCount}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Inactivas</span>
                <span className="kpi-value kpi-bad">{inactivasCount}</span>
              </div>
            </div>

            {/* Buscador */}
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Tabla principal */}
            <section className="tabla-panel">
              <div className="tabla-inner">
                <table className="tabla-comunidades">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Miembros</th>
                      <th>Reportes al día</th>
                      <th>Administrador</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center" }}>
                          Cargando comunidades...
                        </td>
                      </tr>
                    ) : comunidadesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center" }}>
                          No se encontraron comunidades.
                        </td>
                      </tr>
                    ) : (
                      comunidadesFiltradas.map((c) => (
                        <tr key={c.id}>
                          <td>{c.codigoAcceso ?? "—"}</td>
                          <td>{c.nombre}</td>

                          {/* Demo por ahora */}
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>

                          <td>
                            <span className={badgeClass(c.estado)}>
                              {c.estado === "ACTIVA"
                                ? "Activa"
                                : c.estado === "RECHAZADA"
                                ? "Rechazada"
                                : "Solicitada"}
                            </span>
                          </td>
                          <td className="acciones">
                            <button
                              className="icon-button"
                              onClick={() =>
                                alert("Editar comunidad (pendiente)")
                              }
                            >
                              <img src={iconEdit} alt="Editar" />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() =>
                                alert("Eliminar / desactivar (pendiente)")
                              }
                            >
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
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
