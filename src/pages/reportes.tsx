// src/pages/Reportes.tsx
import "../styles/reporte.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_rojo.png";
import iconEliminar from "../assets/icon_eliminar2.svg";

import {useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  reportesService,
  type Reporte,
  type EstadoReporte,
} from "../services/reportes.service";

// ✅ Export libs
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ Animaciones + UI pro
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  Download,
  RefreshCcw,
  FileSpreadsheet,
  FileText,
  ClipboardList,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Flame,
} from "lucide-react";

// ✅ Charts (BAR + DONUT)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

type Granularity = "dia" | "mes" | "anio";

const PIE_COLORS = [
  "#f95150",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
];

function getBadgeClass(estado: EstadoReporte): string {
  if (estado === "Atendido") return "badge badge-ok";
  if (estado === "Pendiente") return "badge badge-warning";
  return "badge badge-bad";
}

function getSessionUser(): SessionUser {
  const candidates = [
    "usuario",
    "user",
    "authUser",
    "safezone_user",
    "sessionUser",
  ];
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

// helper para comparar fecha del filtro con la del reporte
function fechaToISO(fechaDDMMYYYY: string): string {
  const [dd, mm, yyyy] = (fechaDDMMYYYY ?? "").split("/");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function ddmmyyyyToDate(fechaDDMMYYYY: string): Date | null {
  const [dd, mm, yyyy] = (fechaDDMMYYYY ?? "").split("/");
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/* =========================
   Tooltip PRO (glass) — stacked
========================= */
function ReportesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const items = payload
    .filter((p) => typeof p?.value === "number")
    .map((p) => ({
      name: String(p.name ?? ""),
      value: Number(p.value ?? 0),
      color: String((p as any)?.color ?? "#f95150"),
    }))
    .filter((x) => x.value > 0);

  const total = items.reduce((acc, x) => acc + x.value, 0);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>

      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" />
        <span className="chart-tooltip-value">{total}</span>
        <span className="chart-tooltip-unit">reportes</span>
      </div>

      {items.length > 0 && (
        <div className="chart-tooltip-list">
          {items.map((it) => (
            <div key={it.name} className="chart-tooltip-li">
              <span
                className="chart-tooltip-dot-sm"
                style={{ background: it.color }}
              />
              <span className="chart-tooltip-li-name">{it.name}</span>
              <span className="chart-tooltip-li-val">{it.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Avatar fallback (si falla foto)
========================= */
function initialsOf(name: string) {
  const parts = String(name || "Usuario")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return (a + b).slice(0, 2);
}

function svgAvatar(initials: string) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop stop-color="#e2e8f0"/>
        <stop offset="1" stop-color="#cbd5e1"/>
      </linearGradient>
    </defs>
    <rect width="72" height="72" rx="36" fill="url(#g)"/>
    <circle cx="36" cy="30" r="14" fill="rgba(15,23,42,0.12)"/>
    <rect x="18" y="44" width="36" height="16" rx="8" fill="rgba(15,23,42,0.12)"/>
    <text x="36" y="41" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="800" fill="rgba(15,23,42,0.65)">${initials}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function normalizeMaybeUrl(raw?: string | null) {
  if (!raw) return "";
  const v = String(raw).trim();
  if (!v) return "";
  // ya es absoluta
  if (/^https?:\/\//i.test(v)) return v;

  // intenta resolver contra VITE_API_URL si existe
  const apiBase = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (apiBase) {
    try {
      return new URL(v, apiBase).toString();
    } catch {
      return v;
    }
  }

  // como último recurso, devuelve tal cual (por si ya sirve en tu entorno)
  return v;
}

export default function Reportes() {
  const navigate = useNavigate();

  // ✅ sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔹 DATA REAL
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // ✅ buscador topbar
  const [busqueda, setBusqueda] = useState("");

  // 🔹 ESTADOS DE LOS FILTROS
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  // ✅ Gráfico (día/mes/año)
  const [granularity, setGranularity] = useState<Granularity>("mes");

  // ✅ Export dropdown
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [me] = useState<SessionUser>(() => getSessionUser());

  const handleLogout = () => navigate("/login");
  const closeSidebar = () => setSidebarOpen(false);

  // =====================
  // CARGAR REPORTES
  // =====================
  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await reportesService.listar();
      setReportes(data);
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

  // ✅ Cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 901) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ Cerrar dropdown al click fuera / ESC
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

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) =>
    setBusqueda(e.target.value);

  // 🔹 LISTAS ÚNICAS PARA LOS SELECT
  const tiposUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.tipo))).filter(Boolean),
    [reportes]
  );

  const estadosUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.estado))).filter(Boolean),
    [reportes]
  );

  const comunidadesUnicas = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.comunidad))).filter(Boolean),
    [reportes]
  );

  // 🔹 APLICAR FILTROS
  const reportesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();

    return reportes.filter((r) => {
      if (filtroTipo && r.tipo !== filtroTipo) return false;
      if (filtroEstado && r.estado !== filtroEstado) return false;
      if (filtroComunidad && r.comunidad !== filtroComunidad) return false;

      if (filtroFecha) {
        const fechaReporteISO = fechaToISO(r.fecha);
        if (fechaReporteISO !== filtroFecha) return false;
      }

      if (term) {
        const hay =
          String(r.id ?? "")
            .toLowerCase()
            .includes(term) ||
          String(r.usuario ?? "")
            .toLowerCase()
            .includes(term) ||
          String(r.tipo ?? "")
            .toLowerCase()
            .includes(term) ||
          String(r.comunidad ?? "")
            .toLowerCase()
            .includes(term) ||
          String(r.estado ?? "")
            .toLowerCase()
            .includes(term);
        if (!hay) return false;
      }

      return true;
    });
  }, [
    reportes,
    busqueda,
    filtroTipo,
    filtroEstado,
    filtroComunidad,
    filtroFecha,
  ]);

  // =====================
  // KPIs
  // =====================
  const kpiTotal = reportesFiltrados.length;
  const kpiAtendidos = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Atendido").length,
    [reportesFiltrados]
  );
  const kpiPendientes = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Pendiente").length,
    [reportesFiltrados]
  );
  const kpiFalsos = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Falso positivo").length,
    [reportesFiltrados]
  );

  // =====================
  // BAR CHART DATA (por día/mes/año)
  // =====================
  const barData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        atendido: number;
        pendiente: number;
        falso: number;
        sortKey: number;
      }
    >();

    const keyFor = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      if (granularity === "dia") {
        const k = `${y}-${m}-${day}`;
        return { groupKey: k, label: `${day}/${m}`, sortKey: d.getTime() };
      }
      if (granularity === "mes") {
        const k = `${y}-${m}`;
        const sort = new Date(y, d.getMonth(), 1).getTime();
        return { groupKey: k, label: `${m}/${y}`, sortKey: sort };
      }
      const k = `${y}`;
      const sort = new Date(y, 0, 1).getTime();
      return { groupKey: k, label: `${y}`, sortKey: sort };
    };

    for (const r of reportesFiltrados) {
      const d = ddmmyyyyToDate(r.fecha);
      if (!d) continue;

      const { groupKey, label, sortKey } = keyFor(d);

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          label,
          atendido: 0,
          pendiente: 0,
          falso: 0,
          sortKey,
        });
      }
      const row = map.get(groupKey)!;

      if (r.estado === "Atendido") row.atendido += 1;
      else if (r.estado === "Pendiente") row.pendiente += 1;
      else row.falso += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [reportesFiltrados, granularity]);

  // =====================
  // DONUT DATA (por comunidad)
  // =====================
  const donutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reportesFiltrados) {
      const k = r.comunidad || "Sin comunidad";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restSum = rest.reduce((acc, x) => acc + x.value, 0);

    if (restSum > 0) top.push({ name: "Otras", value: restSum });
    return top;
  }, [reportesFiltrados]);

  // =====================
  // TOP USUARIOS (tipo "Top pages" + FOTO ORIGINAL)
  // =====================
  const topUsuarios = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reportesFiltrados) {
      const k = r.usuario || "Usuario";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [reportesFiltrados]);

  // Foto real por usuario (la que trae tu backend)
  // Tip: tu API debería traer algo como r.usuarioFotoUrl (ideal)
  type ReporteFoto = Reporte & {
    usuarioFotoUrl?: string | null;
    fotoUrl?: string | null;
    avatarUrl?: string | null;
    usuarioAvatarUrl?: string | null;
  };

  const userPhotoByName = useMemo(() => {
    const m = new Map<string, string>();

    for (const r0 of reportesFiltrados) {
      const r = r0 as ReporteFoto;
      const name = r.usuario || "Usuario";

      const raw =
        r.usuarioFotoUrl ??
        r.fotoUrl ??
        r.avatarUrl ??
        r.usuarioAvatarUrl ??
        (r as any)?.usuario_foto_url ??
        (r as any)?.foto_usuario ??
        (r as any)?.usuario_avatar ??
        "";

      const url = normalizeMaybeUrl(raw);
      if (url && !m.has(name)) m.set(name, url);
    }

    return m;
  }, [reportesFiltrados]);

  const topMax = useMemo(() => {
    const v = topUsuarios[0]?.value ?? 0;
    return v <= 0 ? 1 : v;
  }, [topUsuarios]);

  const avatarFor = (name: string) => {
    const url = userPhotoByName.get(name) || "";
    if (url) return url;
    return svgAvatar(initialsOf(name));
  };

  // =====================
  // ELIMINAR
  // =====================
  const eliminarReporte = async (id: string) => {
    const ok = window.confirm("¿Seguro que deseas eliminar este reporte?");
    if (!ok) return;

    try {
      await reportesService.eliminar(id);
      setReportes((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar el reporte");
    }
  };

  // =====================
  // EXPORT (sin Ubicación ni Acciones)
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
      { wch: 10 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
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

    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", 95, 10, 20, 28);
    } catch {
      // ignore
    }

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
        0: { cellWidth: 14 },
        1: { cellWidth: 34 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 22 },
        5: { cellWidth: 26 },
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

        {/* SIDEBAR */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          closeSidebar={() => setSidebarOpen(false)}
        />
        {/* MAIN */}
        <main className="reportes-main">
          <motion.div
            className="reportes-panel card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {/* TOPBAR */}
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
                  <div className="page-title">Reportes</div>

                  <div className={`search-pill-v2 ${busqueda ? "open" : ""}`}>
                    <span className="search-ico-v2" aria-hidden="true">
                      <Search size={18} />
                    </span>

                    <input
                      type="text"
                      className="search-input-v2"
                      placeholder="Buscar por ID, usuario, tipo, estado o comunidad..."
                      value={busqueda}
                      onChange={handleChangeBusqueda}
                    />

                    {!!busqueda && (
                      <button
                        className="search-clear-v2"
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => setBusqueda("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div ref={exportRef} className="topbar-actions">
                  <button
                    className="action-pill action-pill-icon"
                    onClick={() => setOpenExport((v) => !v)}
                    disabled={!canExport}
                    title="Exportar reporte"
                    type="button"
                    aria-label="Exportar"
                  >
                    <Download size={18} />
                    Exportar
                  </button>

                  {openExport && (
                    <div className="export-dropdown">
                      <button
                        className="export-option"
                        onClick={() => {
                          exportExcel();
                          setOpenExport(false);
                        }}
                        type="button"
                      >
                        <FileSpreadsheet size={16} />
                        Excel (.xlsx)
                      </button>

                      <button
                        className="export-option"
                        onClick={() => {
                          exportPDF();
                          setOpenExport(false);
                        }}
                        type="button"
                      >
                        <FileText size={16} />
                        PDF
                      </button>
                    </div>
                  )}

                  <button
                    className="action-pill action-pill-accent"
                    onClick={cargarReportes}
                    disabled={loading}
                    title="Recargar"
                    type="button"
                  >
                    <RefreshCcw size={18} />
                    {loading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="ui-error">{error}</div>}

            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Total reportes</span>
                  <div className="kpi-icon kpi-total" aria-hidden="true">
                    <ClipboardList size={24} />
                  </div>
                </div>
                <div className="kpi-value">{kpiTotal}</div>
                <div className="kpi-sub">Según filtros actuales</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Atendidos</span>
                  <div className="kpi-icon kpi-ok" aria-hidden="true">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
                <div className="kpi-value">{kpiAtendidos}</div>
                <div className="kpi-sub">Resueltos / gestionados</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Pendientes</span>
                  <div className="kpi-icon kpi-warn" aria-hidden="true">
                    <Clock3 size={24} />
                  </div>
                </div>
                <div className="kpi-value">{kpiPendientes}</div>
                <div className="kpi-sub">Por revisar</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Falsos positivos</span>
                  <div className="kpi-icon kpi-bad" aria-hidden="true">
                    <ShieldAlert size={24} />
                  </div>
                </div>
                <div className="kpi-value">{kpiFalsos}</div>
                <div className="kpi-sub">Marcados como no válidos</div>
              </div>
            </div>

            {/* FILTROS */}
            <div className="filters-row">
              <select
                className="filter-pill"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Tipo de reporte</option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <select
                className="filter-pill"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Estado</option>
                {estadosUnicos.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

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

              <input
                type="date"
                className="filter-pill filter-date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            {/* Charts + Side card */}
            <div className="grid-2col">
              <section className="chart-card-v3 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Reportes en el tiempo</div>
                    <div className="chart-sub-v2">
                      Barras por período (según filtros)
                    </div>
                  </div>

                  <select
                    className="filter-pill mini-select"
                    value={granularity}
                    onChange={(e) =>
                      setGranularity(e.target.value as Granularity)
                    }
                    title="Agrupar por"
                  >
                    <option value="dia">Día</option>
                    <option value="mes">Mes</option>
                    <option value="anio">Año</option>
                  </select>
                </div>

                <div className="line-chart-wrap6">
                  {barData.length === 0 ? (
                    <div className="chart-empty">
                      No hay datos para graficar con esos filtros.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                        barCategoryGap="26%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          opacity={0.16}
                          vertical={false}
                        />

                        <XAxis
                          dataKey="label"
                          tickMargin={10}
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "rgba(15,23,42,0.65)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        />

                        <YAxis
                          tickMargin={10}
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "rgba(15,23,42,0.55)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        />

                        <Tooltip
                          cursor={{ fill: "rgba(249,81,80,0.08)" }}
                          content={<ReportesTooltip />}
                        />

                        <Bar
                          dataKey="atendido"
                          stackId="a"
                          name="Atendido"
                          fill="#22c55e"
                          radius={[10, 10, 0, 0]}
                          maxBarSize={36}
                          animationDuration={650}
                        />
                        <Bar
                          dataKey="pendiente"
                          stackId="a"
                          name="Pendiente"
                          fill="#f59e0b"
                          radius={[10, 10, 0, 0]}
                          maxBarSize={36}
                          animationDuration={650}
                        />
                        <Bar
                          dataKey="falso"
                          stackId="a"
                          name="Falso positivo"
                          fill="#ef4444"
                          radius={[10, 10, 0, 0]}
                          maxBarSize={36}
                          animationDuration={650}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              <section className="side-card-v3 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Reportes por comunidad</div>
                    <div className="chart-sub-v2">Top 5 + Otras</div>
                  </div>
                </div>

                <div className="donut-wrap">
                  {donutData.length === 0 ? (
                    <div className="chart-empty">No hay datos.</div>
                  ) : (
                    <>
                      <div className="donut-chart-v2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={64}
                              outerRadius={110}
                              paddingAngle={2}
                              stroke="rgba(255,255,255,0.55)"
                              strokeWidth={1}
                            >
                              {donutData.map((_, idx) => (
                                <Cell
                                  key={idx}
                                  fill={PIE_COLORS[idx % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="donut-center-v2">
                          <div className="donut-total">{kpiTotal}</div>
                          <div className="donut-label">Total</div>
                        </div>
                      </div>

                      <div className="donut-legend">
                        {donutData.map((d, idx) => (
                          <div className="donut-li" key={d.name}>
                            <span
                              className="donut-dot"
                              style={{
                                background: PIE_COLORS[idx % PIE_COLORS.length],
                              }}
                            />
                            <span className="donut-name" title={d.name}>
                              {d.name}
                            </span>
                            <span className="donut-val">{d.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* ✅ TOP USUARIOS estilo "Top pages" + foto real */}
                      <div className="topbars">
                        <div className="topbars-head">
                          <div>
                            <div className="topbars-title">Top usuarios</div>
                            <div className="topbars-sub">
                              Reportes generados
                            </div>
                          </div>

                          <div
                            className="topbars-icon"
                            aria-hidden="true"
                            title="Ranking"
                          >
                            <Flame size={18} />
                          </div>
                        </div>

                        <div className="topbars-list">
                          {topUsuarios.length === 0 ? (
                            <div className="topbars-empty">Sin datos</div>
                          ) : (
                            topUsuarios.map((u) => {
                              const pct = Math.max(
                                10,
                                Math.round((u.value / topMax) * 100)
                              );
                              const src = avatarFor(u.name);
                              const fallback = svgAvatar(initialsOf(u.name));

                              return (
                                <div className="topbars-row" key={u.name}>
                                  <div className="topbars-left">
                                    <img
                                      className="topbars-avatar"
                                      src={src}
                                      alt={u.name}
                                      loading="lazy"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).src = fallback;
                                      }}
                                    />

                                    <div className="topbars-bar" title={u.name}>
                                      <div
                                        className="topbars-fill"
                                        style={{ width: `${pct}%` }}
                                      />
                                      <div className="topbars-label">
                                        {u.name}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="topbars-value">
                                    {u.value.toLocaleString("es-EC")}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* TABLA */}
            <section className="reportes-card">
              <div className="tabla-inner">
                <table className="reportes-tabla">
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
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "center",
                            padding: "14px",
                            fontWeight: 900,
                          }}
                        >
                          Cargando reportes...
                        </td>
                      </tr>
                    ) : reportesFiltrados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "center",
                            padding: "14px",
                            fontWeight: 900,
                          }}
                        >
                          No se encontraron reportes.
                        </td>
                      </tr>
                    ) : (
                      reportesFiltrados.map((reporte) => (
                        <tr key={reporte.id}>
                          <td title={String(reporte.id)}>{reporte.id}</td>
                          <td title={reporte.usuario}>{reporte.usuario}</td>
                          <td title={reporte.tipo}>{reporte.tipo}</td>
                          <td title={reporte.comunidad}>{reporte.comunidad}</td>
                          <td title={reporte.fecha}>{reporte.fecha}</td>
                          <td title={reporte.ubicacion}>{reporte.ubicacion}</td>
                          <td>
                            <span className={getBadgeClass(reporte.estado)}>
                              {reporte.estado}
                            </span>
                          </td>
                          <td className="acciones">
                            <button
                              className="icon-button"
                              onClick={() => eliminarReporte(reporte.id)}
                              title="Eliminar"
                              type="button"
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
          </motion.div>
        </main>
      </div>
    </>
  );
}
