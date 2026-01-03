// src/pages/Comunidades.tsx
import "../styles/comunidad.css";

import logoSafeZone from "../assets/logo_rojo.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEdit from "../assets/icon_edit.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  comunidadesService,
  type Comunidad,
  type EstadoComunidad,
} from "../services/comunidad.Service";

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

export default function Comunidades() {
  const navigate = useNavigate();

  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Dropdown export
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

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

  const [me, setMe] = useState<SessionUser>(() => getSessionUser());

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

  // =========================
  // ✅ EXPORT HELPERS
  // =========================
  const buildExportRows = () =>
    comunidadesFiltradas.map((c) => ({
      Codigo: c.codigoAcceso ?? "—",
      Nombre: c.nombre ?? "—",
      Miembros: c.miembrosCount ?? 0,
      Direccion: c.direccion ?? "—",
      Estado: labelEstado(c.estado),
    }));

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    // anchos
    ws["!cols"] = [
      { wch: 14 }, // Codigo
      { wch: 28 }, // Nombre
      { wch: 12 }, // Miembros
      { wch: 60 }, // Direccion
      { wch: 14 }, // Estado
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comunidades");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_comunidades_${stamp}.xlsx`);
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

    // Logo centrado arriba (se ve pro)
    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", 95, 10, 20, 28); // x,y,w,h
    } catch {
      // si falla el logo, igual genera el PDF
    }

    doc.setFontSize(16);
    doc.text("Reporte de Comunidades", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 105, 52, {
      align: "center",
    });

    autoTable(doc, {
      startY: 60,
      head: [["Código", "Nombre", "Miembros", "Dirección", "Estado"]],
      body: comunidadesFiltradas.map((c) => [
        c.codigoAcceso ?? "—",
        c.nombre ?? "—",
        String(c.miembrosCount ?? 0),
        c.direccion ?? "—",
        labelEstado(c.estado),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 36 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 86 },
        4: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_comunidades_${stamp}.pdf`);
  };

  const canExport = comunidadesFiltradas.length > 0;

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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1 className="panel-title">Comunidades registradas</h1>

              {/* ✅ Exportar (dropdown) + Recargar */}
              <div
                ref={exportRef}
                style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}
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

                          {/* ✅ Miembros */}
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

            <p className="panel-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
