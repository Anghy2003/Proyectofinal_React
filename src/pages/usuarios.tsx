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

type EstadoUsuario = "Activo" | "Suspendido";

type UsuarioUI = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  comunidad: string;
  rol: string;
  estado: EstadoUsuario;
  fechaRegistro: string;
  horaRegistro: string;
  ultimoAcceso: string;
  fotoUrl?: string;
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

export default function Usuarios() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Export dropdown
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ✅ Sidebar responsive
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

          return {
            id: u.id,
            nombre: `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim(),
            email: u.email ?? "",
            telefono: u.telefono ?? "",
            comunidad,
            rol: rolUI,
            estado: u.activo ? "Activo" : "Suspendido",
            fechaRegistro: reg.fecha,
            horaRegistro: reg.hora,
            ultimoAcceso: acc.fecha ? `${acc.fecha} ${acc.hora}` : "—",
            fotoUrl: u.fotoUrl,
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

  // ✅ cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => navigate("/login");

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) =>
    setBusqueda(e.target.value);

  const [me] = useState<SessionUser>(() => getSessionUser());

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
      Estado: u.estado ?? "—",
      Registro: `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
      "Ultimo acceso": u.ultimoAcceso ?? "—",
    }));

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 26 },
      { wch: 32 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
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

    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", 95, 10, 20, 28);
    } catch {}

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
        "Estado",
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
        `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
        u.ultimoAcceso ?? "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 10, right: 10 },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_usuarios_${stamp}.pdf`);
  };

  const canExport = usuariosFiltrados.length > 0;

  return (
    <>
      <div className="background" />

      {/* ✅ overlay móvil */}
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="dashboard">
        {/* ========== SIDEBAR ========== */}
        <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="sidebar-header">
            <img src={logoSafeZone} alt="SafeZone" className="sidebar-logo" />
            <div className="sidebar-title">SafeZone Admin</div>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className="sidebar-item" onClick={() => setSidebarOpen(false)}>
              <img src={iconDashboard} className="nav-icon" alt="Panel" />
              <span>Panel</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item" onClick={() => setSidebarOpen(false)}>
              <img src={iconComu} className="nav-icon" alt="Comunidades" />
              <span>Comunidades</span>
            </Link>

            <Link to="/usuarios" className="sidebar-item active" onClick={() => setSidebarOpen(false)}>
              <img src={iconUsuario} className="nav-icon" alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <div className="sidebar-section-label">MANAGEMENT</div>

            <Link to="/analisis" className="sidebar-item" onClick={() => setSidebarOpen(false)}>
              <img src={iconIa} className="nav-icon" alt="Alertas" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/reportes" className="sidebar-item" onClick={() => setSidebarOpen(false)}>
              <img src={iconRepo} className="nav-icon" alt="Reportes" />
              <span>Reportes</span>
            </Link>

            <Link to="/codigo-acceso" className="sidebar-item" onClick={() => setSidebarOpen(false)}>
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
          {/* ✅ topbar solo móvil */}
          <div className="usuarios-topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
              ☰
            </button>
            <div className="topbar-title">
              <h1 className="usuarios-title">Usuarios</h1>
              <span className="topbar-subtitle">Administración</span>
            </div>
          </div>

          <div className="usuario-panel">
            {/* ✅ Header desktop */}
            <div className="usuarios-header">
              <h1 className="usuarios-title desktop-title">Usuarios</h1>

              <div ref={exportRef} className="usuarios-actions">
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
                  <div className="export-dropdown">
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
                className="usuarios-search-input"
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
                <div className="table-scroll">
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
                              <img src={iconImagen} alt="foto" className="user-photo-icon" />
                            )}
                          </td>
                          <td>{u.nombre}</td>
                          <td className="td-email">{u.email}</td>
                          <td>{u.telefono}</td>
                          <td>{u.comunidad}</td>
                          <td>{u.rol}</td>
                          <td>
                            <span
                              className={
                                u.estado === "Activo" ? "badge badge-success" : "badge badge-danger"
                              }
                            >
                              {u.estado}
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
                          <td colSpan={10} style={{ textAlign: "center" }}>
                            No se encontraron usuarios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
