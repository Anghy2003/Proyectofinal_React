// src/pages/CodigoAcceso.tsx
import "../styles/codigocom.css";

import logoSafeZone from "../assets/logo_rojo.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { comunidadesService, type Comunidad } from "../services/comunidad.Service";
import { authService } from "../services/auth.service";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

type CodigoRow = {
  id: number;
  codigo: string;
  comunidad: string;
  fecha: string;
  estado: "Activo" | "Inactivo";
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
    } catch {}
  }
  return { nombre: "Equipo SafeZone", rol: "Admin" };
}

export default function CodigoAcceso() {
  const navigate = useNavigate();

  const [todas, setTodas] = useState<Comunidad[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [codigoActual, setCodigoActual] = useState<string | null>(null);
  const [listaCodigos, setListaCodigos] = useState<CodigoRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const pendientes = useMemo(() => todas.filter((c) => c.estado === "SOLICITADA"), [todas]);
  const activas = useMemo(() => todas.filter((c) => c.estado === "ACTIVA"), [todas]);

  const cargarComunidades = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await comunidadesService.listar();
      setTodas(data);

      const rows: CodigoRow[] = data
        .filter((c) => c.estado === "ACTIVA" && !!c.codigoAcceso)
        .map((c) => ({
          id: c.id,
          codigo: c.codigoAcceso as string,
          comunidad: c.nombre,
          fecha: new Date(c.fechaCreacion).toLocaleDateString("es-EC"),
          estado: "Activo",
        }));

      setListaCodigos(rows);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "No se pudieron cargar las comunidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = authService.getSession();
    if (!session?.userId) {
      navigate("/login");
      return;
    }
    cargarComunidades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aprobarComunidad = async () => {
    if (typeof selectedId !== "number") {
      alert("Selecciona una comunidad en estado SOLICITADA.");
      return;
    }

    const session = authService.getSession();
    if (!session?.userId) {
      alert("Sesión no encontrada. Inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const comunidadActualizada = await comunidadesService.aprobar(selectedId, session.userId);

      if (!comunidadActualizada.codigoAcceso) {
        alert("La comunidad se aprobó, pero el backend no devolvió un código de acceso.");
        return;
      }

      setCodigoActual(comunidadActualizada.codigoAcceso);

      setTodas((prev) => {
        const rest = prev.filter((c) => c.id !== comunidadActualizada.id);
        return [comunidadActualizada, ...rest];
      });

      setListaCodigos((prev) => {
        const rest = prev.filter((r) => r.id !== comunidadActualizada.id);
        return [
          {
            id: comunidadActualizada.id,
            codigo: comunidadActualizada.codigoAcceso ?? "",
            comunidad: comunidadActualizada.nombre,
            fecha: new Date(comunidadActualizada.fechaCreacion).toLocaleDateString("es-EC"),
            estado: "Activo",
          },
          ...rest,
        ];
      });

      setSelectedId(null);

      alert("Comunidad aprobada y código generado correctamente. Si Twilio está configurado, se envió el SMS.");
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "No se pudo aprobar la comunidad.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const [me] = useState<SessionUser>(() => getSessionUser());

  const copiarCodigo = async () => {
    if (!codigoActual) return;
    try {
      await navigator.clipboard.writeText(codigoActual);
      alert("Código copiado al portapapeles");
    } catch {
      alert("No se pudo copiar el código");
    }
  };

  const eliminarCodigo = (id: number) => {
    setListaCodigos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <>
      <div className="background" />

      <div className="dashboard">
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

            <Link to="/codigo-acceso" className="sidebar-item active">
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

        <main className="main">
          <section className="panel">
            <div className="panel-head">
              <h1 className="title">Generar Código de Comunidad</h1>

              <button className="action-pill action-pill-accent" onClick={cargarComunidades} disabled={loading}>
                {loading ? "Cargando..." : "Recargar"}
              </button>
            </div>

            {error && <div className="ui-error">{error}</div>}

            <div className="form-container">
              <div className="form-card">
                <label>Selecciona una comunidad solicitada</label>

                {/* mismo select, pero con clase para que herede el estilo */}
                <select
                  className="input-pill"
                  value={selectedId ?? ""}
                  onChange={(e) =>
                    setSelectedId(e.target.value === "" ? null : Number(e.target.value))
                  }
                >
                  <option value="">-- Selecciona --</option>
                  {pendientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                <p className="codigo-msg" style={{ textAlign: "left" }}>
                  Estas comunidades fueron enviadas desde la app en estado <strong>SOLICITADA</strong>. Al aprobar,
                  SafeZone generará un código de acceso de 5 dígitos y el backend enviará el código por SMS al usuario
                  solicitante (si Twilio está configurado).
                </p>

                <button
                  className="btn-primary"
                  type="button"
                  onClick={aprobarComunidad}
                  disabled={loading || selectedId === null}
                >
                  {loading ? "Generando..." : "Aprobar y generar código"}
                </button>
              </div>

              <div className="codigo-card">
                <p className="codigo-label">Último código generado para comunidad</p>

                <div className="codigo-box">{codigoActual ?? "---"}</div>

                <p className="codigo-msg">
                  Comparte este código con los vecinos para que se unan desde la app SafeZone. El solicitante lo recibe
                  también por SMS.
                </p>

                <button className="copy-btn" type="button" onClick={copiarCodigo} disabled={!codigoActual}>
                  Copiar
                </button>
              </div>
            </div>

            <h2 className="subtitle">Comunidades activas con código</h2>

            <div className="table-wrapper">
              <table className="tabla_codigos">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Comunidad</th>
                    <th>Fecha Creación</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {listaCodigos.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center" }}>
                        No hay comunidades activas con código todavía.
                      </td>
                    </tr>
                  ) : (
                    listaCodigos.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="codigo-pill">{item.codigo}</span>
                        </td>
                        <td>{item.comunidad}</td>
                        <td>{item.fecha}</td>
                        <td>
                          <span className="badge badge-ok">{item.estado}</span>
                        </td>
                        <td>
                          <img
                            src={iconEliminar}
                            className="trash-icon"
                            alt="Eliminar"
                            onClick={() => eliminarCodigo(item.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="panel-update">Última actualización: {new Date().toLocaleString("es-EC")}</p>
          </section>
        </main>
      </div>
    </>
  );
}
