import "../styles/codigocom.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// 👉 TYPES: type-only import
import type { Comunidad } from "../services/comunidad.Service";
// 👉 FUNCIONES: import normal
import {
  getTodasComunidades,
  aprobarComunidadApi,
} from "../services/comunidad.Service";


type CodigoRow = {
  id: number;
  codigo: string;
  comunidad: string;
  fecha: string;
  estado: "Activo" | "Inactivo";
};

export default function CodigoAcceso() {
  const navigate = useNavigate();

  const [pendientes, setPendientes] = useState<Comunidad[]>([]);
  const [activas, setActivas] = useState<Comunidad[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [codigoActual, setCodigoActual] = useState<string | null>(null);
  const [listaCodigos, setListaCodigos] = useState<CodigoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    navigate("/login");
  };

  // Cargar comunidades al entrar
  useEffect(() => {
    cargarComunidades();
  }, []);

  const cargarComunidades = async () => {
  try {
    // 👉 Traemos TODAS las comunidades del backend
    const todas = await getTodasComunidades();

    // Separar por estado en el FRONT
    const dataPend = todas.filter((c) => c.estado === "SOLICITADA");
    const dataAct = todas.filter((c) => c.estado === "ACTIVA");

    setPendientes(dataPend);
    setActivas(dataAct);

    const rows: CodigoRow[] = dataAct
      .filter((c) => c.codigoAcceso)
      .map((c) => ({
        id: c.id,
        codigo: c.codigoAcceso as string,
        comunidad: c.nombre,
        fecha: new Date(c.fechaCreacion).toLocaleDateString("es-EC"),
        estado: "Activo",
      }));

    setListaCodigos(rows);
  } catch (error) {
    console.error(error);
    alert("No se pudieron cargar las comunidades.");
  }
};

  // ✅ función bien cerrada
  const aprobarComunidad = async () => {
    if (typeof selectedId !== "number") {
      alert("Selecciona una comunidad en estado SOLICITADA.");
      return;
    }

    setLoading(true);
    try {
      const comunidadActualizada = await aprobarComunidadApi(selectedId);

      if (!comunidadActualizada.codigoAcceso) {
        alert(
          "La comunidad se aprobó, pero el backend no devolvió un código de acceso."
        );
        return;
      }

      // Mostrar en el cuadro grande
      setCodigoActual(comunidadActualizada.codigoAcceso);

      // Quitar de pendientes
      setPendientes((prev) =>
        prev.filter((c) => c.id !== comunidadActualizada.id)
      );

      // Actualizar activas
      setActivas((prev) => {
        const rest = prev.filter((c) => c.id !== comunidadActualizada.id);
        return [...rest, comunidadActualizada];
      });

      // Agregar fila a la tabla
      setListaCodigos((prev) => [
        {
          id: comunidadActualizada.id,
          codigo: comunidadActualizada.codigoAcceso ?? "",
          comunidad: comunidadActualizada.nombre,
          fecha: new Date(
            comunidadActualizada.fechaCreacion
          ).toLocaleDateString("es-EC"),
          estado: "Activo",
        },
        ...prev,
      ]);

      alert("Comunidad aprobada y código generado correctamente.");
    } catch (error) {
      console.error(error);
      alert(
        "No se pudo aprobar la comunidad. Verifica el servidor o el endpoint /api/comunidades/{id}/aprobar."
      );
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

            <Link to="/analisis" className="sidebar-item">
              <img src={iconIa} alt="IA Análisis" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/codigo-acceso" className="sidebar-item active">
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
        <main className="main">
          <section className="panel">
            <h1 className="title">Generar Código de Comunidad</h1>

            <div className="form-container">
              {/* Seleccionar comunidad solicitada */}
              <div className="form-card">
                <label>Selecciona una comunidad solicitada</label>
                <select
                  value={selectedId ?? ""} // null -> ""
                  onChange={(e) =>
                    setSelectedId(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
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
                  Estas comunidades fueron enviadas desde la app en estado{" "}
                  <strong>SOLICITADA</strong>. Al aprobar, SafeZone generará un
                  código de acceso de 5 dígitos que se puede compartir con los
                  vecinos.
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

              {/* Cuadro de código generado */}
              <div className="codigo-card">
                <p className="codigo-label">
                  Último código generado para comunidad
                </p>

                <div className="codigo-box">{codigoActual ?? "---"}</div>

                <p className="codigo-msg">
                  Comparte este código con los vecinos para que se unan desde la
                  app SafeZone.
                </p>

                <button
                  className="copy-btn"
                  type="button"
                  onClick={copiarCodigo}
                  disabled={!codigoActual}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Tabla códigos generados */}
            <h2 className="subtitle">Comunidades activas con código</h2>

            <div className="table-wrapper">
              <table className="tabla">
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
                          <span className="badge badge-ok">
                            {item.estado}
                          </span>
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
          </section>
        </main>
      </div>
    </>
  );
}
