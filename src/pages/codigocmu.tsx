// src/pages/CodigoAcceso.tsx
import "../styles/codigocom.css";
import Sidebar from "../components/sidebar";

import iconEliminar from "../assets/icon_eliminar2.svg";

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

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
    } catch {
      // ignore
    }
  }
  return { nombre: "Equipo SafeZone", rol: "Admin" };
}

export default function CodigoAcceso() {
  const navigate = useNavigate();

  // ✅ sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  const [todas, setTodas] = useState<Comunidad[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [codigoActual, setCodigoActual] = useState<string | null>(null);
  const [listaCodigos, setListaCodigos] = useState<CodigoRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [me] = useState<SessionUser>(() => getSessionUser());

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const pendientes = useMemo(() => todas.filter((c) => c.estado === "SOLICITADA"), [todas]);

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
          fecha: c.fechaCreacion ? new Date(c.fechaCreacion).toLocaleDateString("es-EC") : "—",
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

  // ✅ Cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 901) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
            fecha: comunidadActualizada.fechaCreacion
              ? new Date(comunidadActualizada.fechaCreacion).toLocaleDateString("es-EC")
              : "—",
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
        {/* Overlay móvil */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* SIDEBAR (mismo patrón) */}
          <Sidebar sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />

        {/* MAIN */}
        <main className="main">
          <motion.section
            className="panel card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {/* TOPBAR (mismo patrón) */}
            <div className="topbar">
              <button
                className="hamburger"
                type="button"
                aria-label="Abrir menú"
                onClick={() => setSidebarOpen(true)}
              >
                <span />
                <span />
                <span />
              </button>

              <div className="topbar-shell">
                <div className="topbar-left">
                  <div className="page-title">Ajustes</div>
                </div>

                <div className="topbar-actions">
                  <button
                    className="action-pill action-pill-accent"
                    onClick={cargarComunidades}
                    disabled={loading}
                    type="button"
                    title="Recargar"
                  >
                    <RefreshCcw size={18} />
                    {loading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="ui-error">{error}</div>}

            {/* CONTENIDO */}
            <div className="form-container">
              <div className="form-card">
                <h1 className="title">Generar Código de Comunidad</h1>

                <label>Selecciona una comunidad solicitada</label>

                <select
                  className="input-pill"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value === "" ? null : Number(e.target.value))}
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

            {/* Si tu Sidebar necesita logout, normalmente está dentro del Sidebar.
                Si no lo tienes ahí, dime y lo conecto en 2 líneas. */}
          </motion.section>
        </main>
      </div>
    </>
  );
}
