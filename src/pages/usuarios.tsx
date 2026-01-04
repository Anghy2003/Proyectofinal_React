// src/pages/Usuarios.tsx
import "../styles/usuario.css";

import logoSafeZone from "../assets/logo_rojo.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconImagen from "../assets/icon_imagen.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { usuariosService, type UsuarioApi } from "../services/Usuario.Service";

// ✅ Export libs
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

type EstadoUsuarioCuenta = "Activo" | "Suspendido";
type EstadoUsuarioOnline = "Activo" | "Inactivo";

type UsuarioUI = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  comunidad: string;
  rol: string;

  // ✅ Cuenta (habilitado / suspendido)
  estado: EstadoUsuarioCuenta;

  // ✅ Presencia (aprox por último acceso)
  estadoOnline: EstadoUsuarioOnline;

  fechaRegistro: string;
  horaRegistro: string;
  ultimoAcceso: string;
  fotoUrl?: string;

  // guardo ISO original para calcular online con precisión local
  ultimoAccesoIso?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

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

function isoToFechaHora(iso?: string | null) {
  if (!iso) return { fecha: "", hora: "" };
  const d = new Date(iso);
  return {
    fecha: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

/**
 * ✅ Presencia aproximada:
 * - "Activo" si último acceso fue <= X minutos
 * - "Inactivo" si no hay último acceso o fue hace más tiempo
 *
 * Ajusta ONLINE_THRESHOLD_MIN si quieres 2, 5, 10 minutos, etc.
 */
const ONLINE_THRESHOLD_MIN = 1;

function minutesDiffFromNow(iso?: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const last = new Date(iso).getTime();
  if (Number.isNaN(last)) return Number.POSITIVE_INFINITY;
  const now = Date.now();
  return Math.floor((now - last) / 60000);
}

function getEstadoOnline(ultimoAccesoIso?: string | null): EstadoUsuarioOnline {
  const mins = minutesDiffFromNow(ultimoAccesoIso);
  return mins <= ONLINE_THRESHOLD_MIN ? "Activo" : "Inactivo";
}

export default function Usuarios() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Export dropdown
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [me] = useState<SessionUser>(() => getSessionUser());

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        setError(null);

        const data: UsuarioApi[] = await usuariosService.listar();

        const usuariosTransformados: UsuarioUI[] = data.map((u) => {
          const reg = isoToFechaHora(u.fechaRegistro);
          const acc = isoToFechaHora(u.ultimoAcceso);

          const comunidad = (u.comunidadNombre ?? "").trim() || "—";

          const rolUI =
            (u.rol ?? "").toLowerCase() === "admin" || u.id === 1
              ? "Administrador"
              : "Usuario";

          const ultimoAccesoIso = u.ultimoAcceso ?? null;

          return {
            id: u.id,
            nombre: `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim(),
            email: u.email ?? "",
            telefono: u.telefono ?? "",
            comunidad,
            rol: rolUI,

            // ✅ Estado de CUENTA
            estado: u.activo ? "Activo" : "Suspendido",

            // ✅ Estado ONLINE (aprox)
            estadoOnline: getEstadoOnline(ultimoAccesoIso),

            fechaRegistro: reg.fecha,
            horaRegistro: reg.hora,
            ultimoAcceso: acc.fecha ? `${acc.fecha} ${acc.hora}` : "—",
            fotoUrl: u.fotoUrl,
            ultimoAccesoIso,
          };
        });

        setUsuarios(usuariosTransformados);
      } catch (err) {
        console.error("Error cargando usuarios", err);
        setError("No se pudieron cargar los usuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  // Cerrar dropdown al click fuera / ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openExport) return;
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setOpenExport(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenExport(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openExport]);

  const handleLogout = () => navigate("/login");

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) =>
    setBusqueda(e.target.value);

  const usuariosFiltrados = usuarios.filter((u) => {
    const term = busqueda.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.comunidad.toLowerCase().includes(term)
    );
  });

  // =========================
  // ✅ EXPORT HELPERS (sin foto)
  // =========================
  const buildExportRows = () =>
    usuariosFiltrados.map((u) => ({
      Nombre: u.nombre ?? "—",
      Correo: u.email ?? "—",
      Telefono: u.telefono ?? "—",
      Comunidad: u.comunidad ?? "—",
      Rol: u.rol ?? "—",

      // ✅ Incluyo ambos estados
      "Estado cuenta": u.estado ?? "—",
      Online: u.estadoOnline ?? "—",

      Registro: `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
      "Ultimo acceso": u.ultimoAcceso ?? "—",
    }));

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 26 }, // Nombre
      { wch: 32 }, // Correo
      { wch: 16 }, // Telefono
      { wch: 22 }, // Comunidad
      { wch: 16 }, // Rol
      { wch: 14 }, // Estado cuenta
      { wch: 10 }, // Online
      { wch: 18 }, // Registro
      { wch: 18 }, // Ultimo acceso
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_usuarios_${stamp}.xlsx`);
  };

  const toDataURL = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const exportPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");

    // Logo centrado arriba
    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", 95, 10, 20, 28);
    } catch {
      // si falla el logo, igual genera el PDF
    }

    doc.setFontSize(16);
    doc.text("Reporte de Usuarios", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 105, 52, {
      align: "center",
    });

    autoTable(doc, {
      startY: 60,
      head: [[
        "Nombre",
        "Correo",
        "Teléfono",
        "Comunidad",
        "Rol",
        "Estado cuenta",
        "Online",
        "Registro",
        "Último acceso",
      ]],
      body: usuariosFiltrados.map((u) => [
        u.nombre ?? "—",
        u.email ?? "—",
        u.telefono ?? "—",
        u.comunidad ?? "—",
        u.rol ?? "—",
        u.estado ?? "—",
        u.estadoOnline ?? "—",
        `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
        u.ultimoAcceso ?? "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 26 }, // Nombre
        1: { cellWidth: 42 }, // Correo
        2: { cellWidth: 18 }, // Teléfono
        3: { cellWidth: 18 }, // Comunidad
        4: { cellWidth: 16 }, // Rol
        5: { cellWidth: 18 }, // Estado cuenta
        6: { cellWidth: 14 }, // Online
        7: { cellWidth: 18 }, // Registro
        8: { cellWidth: 20 }, // Último acceso
      },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_usuarios_${stamp}.pdf`);
  };

  const canExport = usuariosFiltrados.length > 0;

  return (
    <>
      <div className="background" />

      <div className="dashboard">
        {/* ========== SIDEBAR ========== */}
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

            <Link to="/usuarios" className="sidebar-item active">
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

        <main className="usuarios-main">
          <div className="usuario-panel">
            {/* ✅ Header con Exportar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h1 className="usuarios-title">Usuarios</h1>

              <div
                ref={exportRef}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <button
                  className="filter-pill"
                  style={{
                    cursor: canExport ? "pointer" : "not-allowed",
                    opacity: canExport ? 1 : 0.6,
                  }}
                  onClick={() => setOpenExport((v) => !v)}
                  disabled={!canExport}
                  title="Exportar reporte"
                >
                  Exportar ▾
                </button>

                {openExport && (
                  <div
                    style={{
                      position: "absolute",
                      top: 44,
                      right: 0,
                      background: "rgba(20,20,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      padding: 6,
                      minWidth: 160,
                      zIndex: 10,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <button
                      className="export-option"
                      onClick={() => {
                        exportExcel();
                        setOpenExport(false);
                      }}
                    >
                      Excel (.xlsx)
                    </button>

                    <button
                      className="export-option"
                      onClick={() => {
                        exportPDF();
                        setOpenExport(false);
                      }}
                    >
                      PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="usuarios-search">
              <input
                type="text"
                placeholder="Buscar por nombre, correo o comunidad..."
                value={busqueda}
                onChange={handleChangeBusqueda}
              />
            </div>

            {loading && <p className="loading">Cargando usuarios…</p>}
            {error && <p className="error">{error}</p>}

            {!loading && (
              <section className="usuarios-card">
                <table className="usuarios-tabla">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Comunidad</th>
                      <th>Rol</th>
                      <th>Estado</th>

                      <th>Registro</th>
                      <th>Último acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.fotoUrl ? (
                            <img src={u.fotoUrl} alt="foto" className="user-photo-icon" />
                          ) : (
                            <img src={iconImagen} alt="foto" />
                          )}
                        </td>

                        <td>{u.nombre}</td>
                        <td>{u.email}</td>
                        <td>{u.telefono}</td>
                        <td>{u.comunidad}</td>
                        <td>{u.rol}</td>


                        {/* ✅ Estado online (aprox) */}
                        <td>
                          <span
                            className={
                              u.estadoOnline === "Activo"
                                ? "badge badge-success"
                                : "badge badge-danger"
                            }
                            title={
                              u.ultimoAccesoIso
                                ? `Último acceso ISO: ${u.ultimoAccesoIso}`
                                : "Sin registro de acceso"
                            }
                          >
                            {u.estadoOnline}
                          </span>
                        </td>

                        <td>
                          {u.fechaRegistro}
                          <br />
                          <span className="time">{u.horaRegistro}</span>
                        </td>

                        <td>{u.ultimoAcceso}</td>

                        <td>
                          <button
                            className="icon-button"
                            title="Eliminar"
                            onClick={() => alert("Eliminar usuario: pendiente backend")}
                          >
                            <img src={iconEliminar} alt="Eliminar" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {usuariosFiltrados.length === 0 && (
                      <tr>
                        {/* ✅ ahora son 11 columnas */}
                        <td colSpan={11} style={{ textAlign: "center" }}>
                          No se encontraron usuarios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}

            <p className="usuarios-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
