// src/pages/Reportes.tsx
import "../styles/reporte.css";

import logoSafeZone from "../assets/logo_rojo.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { reportesService } from "../services/reportes.service";

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

type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

type Reporte = {
  id: string;
  usuario: string;
  tipo: string;
  comunidad: string;
  fecha: string; // dd/mm/aaaa
  ubicacion: string;
  estado: EstadoReporte;
};

function getBadgeClass(estado: EstadoReporte): string {
  if (estado === "Atendido") return "badge badge-ok";
  if (estado === "Pendiente") return "badge badge-warning";
  return "badge badge-bad";
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

// helper para comparar fecha del filtro con la del reporte
function fechaToISO(fechaDDMMYYYY: string): string {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export default function Reportes() {
  const navigate = useNavigate();

  // 🔹 DATA REAL
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // 🔹 ESTADOS DE LOS FILTROS
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  // ✅ Export dropdown
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    navigate("/login");
  };

  // =====================
  // CARGAR REPORTES
  // =====================
  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await reportesService.listar(); // 👈 del service
      setReportes(data as unknown as Reporte[]);
    } catch (e: any) {
      setError(e?.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 🔹 LISTAS ÚNICAS PARA LOS SELECT (basadas en data real)
  const tiposUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.tipo))),
    [reportes]
  );
  const estadosUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.estado))),
    [reportes]
  );
  const comunidadesUnicas = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.comunidad))),
    [reportes]
  );

  // 🔹 APLICAR FILTROS (sobre data real)
  const reportesFiltrados = useMemo(() => {
    return reportes.filter((r) => {
      if (filtroTipo && r.tipo !== filtroTipo) return false;
      if (filtroEstado && r.estado !== filtroEstado) return false;
      if (filtroComunidad && r.comunidad !== filtroComunidad) return false;

      if (filtroFecha) {
        const fechaReporteISO = fechaToISO(r.fecha); // dd/mm/yyyy -> yyyy-mm-dd
        if (fechaReporteISO !== filtroFecha) return false;
      }

      return true;
    });
  }, [reportes, filtroTipo, filtroEstado, filtroComunidad, filtroFecha]);

  const [me, setMe] = useState<SessionUser>(() => getSessionUser());

  // =====================
  // ELIMINAR
  // =====================
  const eliminarReporte = async (id: string) => {
    const ok = window.confirm("¿Seguro que deseas eliminar este reporte?");
    if (!ok) return;

    try {
      await reportesService.eliminar(id); // 👈 backend DELETE /incidentes/{id}
      setReportes((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar el reporte");
    }
  };

  // =====================
  // ✅ EXPORT (sin Ubicación ni Acciones)
  // =====================
  const buildExportRows = () =>
    reportesFiltrados.map((r) => ({
      ID: r.id ?? "—",
      Usuario: r.usuario ?? "—",
      Tipo: r.tipo ?? "—",
      Comunidad: r.comunidad ?? "—",
      Fecha: r.fecha ?? "—",
      Estado: r.estado ?? "—",
    }));

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 10 }, // ID
      { wch: 20 }, // Usuario
      { wch: 22 }, // Tipo
      { wch: 22 }, // Comunidad
      { wch: 14 }, // Fecha
      { wch: 16 }, // Estado
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reportes");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_reportes_${stamp}.xlsx`);
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
      doc.addImage(logo, "PNG", 95, 10, 20, 28); // x,y,w,h
    } catch {}

    doc.setFontSize(16);
    doc.text("Reporte de Incidentes", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 105, 52, {
      align: "center",
    });

    autoTable(doc, {
      startY: 60,
      head: [["ID", "Usuario", "Tipo", "Comunidad", "Fecha", "Estado"]],
      body: reportesFiltrados.map((r) => [
        r.id ?? "—",
        r.usuario ?? "—",
        r.tipo ?? "—",
        r.comunidad ?? "—",
        r.fecha ?? "—",
        r.estado ?? "—",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 14 }, // ID
        1: { cellWidth: 30 }, // Usuario
        2: { cellWidth: 42 }, // Tipo
        3: { cellWidth: 40 }, // Comunidad
        4: { cellWidth: 22 }, // Fecha
        5: { cellWidth: 22 }, // Estado
      },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_reportes_${stamp}.pdf`);
  };

  const canExport = reportesFiltrados.length > 0;

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

            <Link to="/usuarios" className="sidebar-item">
              <img src={iconUsuario} className="nav-icon" alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <div className="sidebar-section-label">MANAGEMENT</div>

            <Link to="/analisis" className="sidebar-item">
              <img src={iconIa} className="nav-icon" alt="Alertas" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/reportes" className="sidebar-item active">
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

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <main className="reportes-main">
          <section className="reportes-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 className="panel-title">Reportes Recientes</h1>

              {/* ✅ Exportar a la izquierda de Recargar */}
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
                      right: 88, // para que el menú no tape el botón Recargar
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
                  onClick={cargarReportes}
                  disabled={loading}
                  title="Recargar"
                >
                  {loading ? "Cargando..." : "Recargar"}
                </button>
              </div>
            </div>

            {/* Mensajes */}
            {error && <div style={{ padding: "10px 0", color: "tomato" }}>{error}</div>}

            {/* KPI */}
            <div className="kpi-row">
              <div className="kpi-card">
                <span className="kpi-label">Total Reportes</span>
                <span className="kpi-value">{reportesFiltrados.length}</span>
              </div>
            </div>

            {/* FILTROS */}
            <div className="filters-row">
              {/* Tipo de reporte */}
              <select className="filter-pill" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Tipo de reporte</option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              {/* Estado */}
              <select className="filter-pill" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Estado</option>
                {estadosUnicos.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              {/* Comunidad */}
              <select
                className="filter-pill"
                value={filtroComunidad}
                onChange={(e) => setFiltroComunidad(e.target.value)}
              >
                <option value="">Comunidad</option>
                {comunidadesUnicas.map((com) => (
                  <option key={com} value={com}>
                    {com}
                  </option>
                ))}
              </select>

              {/* Fecha */}
              <input
                type="date"
                className="filter-pill filter-date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            {/* TABLA */}
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
                    {loading ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "14px" }}>
                          Cargando reportes...
                        </td>
                      </tr>
                    ) : reportesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "14px" }}>
                          No se encontraron reportes.
                        </td>
                      </tr>
                    ) : (
                      reportesFiltrados.map((reporte) => (
                        <tr key={reporte.id}>
                          <td>{reporte.id}</td>
                          <td>{reporte.usuario}</td>
                          <td>{reporte.tipo}</td>
                          <td>{reporte.comunidad}</td>
                          <td>{reporte.fecha}</td>
                          <td>{reporte.ubicacion}</td>
                          <td>
                            <span className={getBadgeClass(reporte.estado)}>{reporte.estado}</span>
                          </td>
                          <td className="acciones">
                            <button
                              className="icon-button"
                              onClick={() => eliminarReporte(reporte.id)}
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
          </section>
        </main>
      </div>
    </>
  );
}
