// src/pages/Comunidades.tsx
import "../styles/comunidad.css";

import logoSafeZone from "../assets/logo_naranja.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEdit from "../assets/icon_edit.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import {
  comunidadesService,
  type Comunidad,
  type EstadoComunidad,
} from "../services/comunidad.Service";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};


export default function Comunidades() {
  const navigate = useNavigate();

  

  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    navigate("/login");
  };

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

  const cargarComunidades = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await comunidadesService.listar();
      setComunidades(data);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las comunidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarComunidades();
  }, []);

  // KPIs
  const totalComunidades = comunidades.length;
  const activasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "ACTIVA").length,
    [comunidades]
  );
  const inactivasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "RECHAZADA").length,
    [comunidades]
  );

  // Filtro por buscador (nombre, código, dirección)
  const comunidadesFiltradas = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return comunidades;

    return comunidades.filter((c) => {
      const nombre = (c.nombre ?? "").toLowerCase();
      const codigo = (c.codigoAcceso ?? "").toLowerCase();
      const direccion = (c.direccion ?? "").toLowerCase();
      return nombre.includes(q) || codigo.includes(q) || direccion.includes(q);
    });
  }, [comunidades, search]);
    const [me, setMe] = useState<SessionUser>(() => getSessionUser());   

  const badgeClass = (estado: EstadoComunidad) => {
    if (estado === "ACTIVA") return "badge badge-success";
    if (estado === "RECHAZADA") return "badge badge-danger";
    return "badge badge-warning"; // SOLICITADA
  };

  const labelEstado = (estado: EstadoComunidad) => {
    if (estado === "ACTIVA") return "Activa";
    if (estado === "RECHAZADA") return "Rechazada";
    return "Solicitada";
  };

  return (
    <>
      <div className="background" />

      <div className="dashboard">
        {/* ========== SIDEBAR (estructura del segundo, estilo del primero) ========== */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logoSafeZone} alt="SafeZone" className="sidebar-logo" />
            <div className="sidebar-title">SafeZone Admin</div>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className="sidebar-item">
              <img src={iconDashboard} className="nav-icon" alt="Panel" />
              <span>Panel</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item active">
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

        {/* CONTENIDO PRINCIPAL */}
        <main className="comunidades-main">
          <div className="comunidades-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1 className="panel-title">Comunidades registradas</h1>

              <button
                className="filter-pill"
                style={{ cursor: "pointer" }}
                onClick={cargarComunidades}
                disabled={loading}
                title="Recargar"
              >
                {loading ? "Cargando..." : "Recargar"}
              </button>
            </div>

            {error && <p style={{ color: "tomato", marginTop: 10 }}>{error}</p>}

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
                placeholder="Buscar por nombre, código o dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Tabla */}
            <section className="tabla-panel">
              <div className="tabla-inner">
                <table className="tabla-comunidades">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Miembros</th>
                      <th>Dirección</th>
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
                          {/* ✅ Foto */}
                          <td>
                            {c.fotoUrl ? (
                              <img
                                src={c.fotoUrl}
                                alt="foto comunidad"
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  objectFit: "cover",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  background: "rgba(255,255,255,0.08)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                }}
                              />
                            )}
                          </td>

                          {/* ✅ Código */}
                          <td>{c.codigoAcceso ?? "—"}</td>

                          {/* ✅ Nombre */}
                          <td>{c.nombre}</td>

                          {/* ✅ Miembros reales (backend ya lo manda) */}
                          <td style={{ textAlign: "center" }}>{c.miembrosCount ?? 0}</td>

                          {/* ✅ Dirección */}
                          <td title={c.direccion ?? ""}>{c.direccion ?? "—"}</td>

                          {/* ✅ Estado */}
                          <td>
                            <span className={badgeClass(c.estado)}>{labelEstado(c.estado)}</span>
                          </td>

                          {/* ✅ Acciones */}
                          <td className="acciones">
                            <button
                              className="icon-button"
                              onClick={() => alert("Editar comunidad (pendiente)")}
                              title="Editar"
                            >
                              <img src={iconEdit} alt="Editar" />
                            </button>

                            <button
                              className="icon-button"
                              onClick={() => alert("Eliminar / desactivar (pendiente)")}
                              title="Eliminar"
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

            <p className="panel-update">Última actualización: {new Date().toLocaleString("es-EC")}</p>
          </div>
        </main>
      </div>
    </>
  );
}
