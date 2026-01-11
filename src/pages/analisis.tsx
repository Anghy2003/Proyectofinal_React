// src/pages/Analisis.tsx
import "../styles/analisis.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_SafeZone.png";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  RefreshCcw,
  Brain,
  Flame,
  AlertTriangle,
  BadgeCheck,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import {
  incidentesService,
  type IncidenteResponseDTO,
} from "../services/incidentesService";

// ✅ Export libs
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";


/* ===================== HELPERS ===================== */
function parseJsonArrayString(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [String(value)];
  }
}

type PrioridadIA = "ALTA" | "MEDIA" | "BAJA" | string;

function getBadgePrioridad(prio?: PrioridadIA | null): string {
  const p = (prio ?? "").toString().toUpperCase();
  if (p === "ALTA") return "badge badge-bad";
  if (p === "MEDIA") return "badge badge-warning";
  if (p === "BAJA") return "badge badge-ok";
  return "badge badge-neutral";
}

function isoToYMD(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}


/* =========================
   Line Chart — incidentes 14d
========================= */
type DailyPoint = { key: string; label: string; incidentes: number };

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtLabel(d: Date) {
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${pad2(d.getDate())} ${meses[d.getMonth()]}`;
}

function buildDailyIncidentes(
  items: IncidenteResponseDTO[],
  days = 14
): DailyPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base: DailyPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { key: toKey(d), label: fmtLabel(d), incidentes: 0 };
  });

  const byKey = new Map(base.map((p) => [p.key, p]));
  let hasRealDates = false;

  for (const it of items) {
    if (!it.fechaCreacion) continue;
    const d = new Date(it.fechaCreacion);
    if (!isValidDate(d)) continue;
    hasRealDates = true;

    d.setHours(0, 0, 0, 0);
    const p = byKey.get(toKey(d));
    if (!p) continue;
    p.incidentes += 1;
  }

  // fallback suave si no hay fechas válidas
  if (!hasRealDates && items.length > 0) {
    items.forEach((_, idx) => {
      base[idx % days].incidentes += 1;
    });
  }

  return base;
}

export default function Analisis() {

  // ✅ sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔹 DATA REAL
  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // 🔹 FILTROS (sin "posible falso")
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  const cargarIncidentes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await incidentesService.listar();
      setIncidentes(data);
    } catch (e: any) {
      setError(e?.message || "Error cargando IA análisis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncidentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 LISTAS ÚNICAS PARA SELECTS
  const categoriasUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiCategoria)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  const prioridadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiPrioridad)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  const comunidadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.comunidadNombre)
            .filter((x): x is string => !!x && x.trim() !== "")
        )
      ),
    [incidentes]
  );

  // 🔹 FILTRADO (sin aiPosibleFalso)
  const incidentesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();

    return incidentes.filter((i) => {
      // Solo con IA real (sin "posible falso")
      const tieneIA =
        i.aiCategoria != null ||
        i.aiPrioridad != null ||
        i.aiConfianza != null ||
        (i.aiMotivos != null && i.aiMotivos !== "") ||
        (i.aiRiesgos != null && i.aiRiesgos !== "");

      if (!tieneIA) return false;

      if (term) {
        const blob = `${i.usuarioNombre ?? ""} ${i.comunidadNombre ?? ""} ${
          i.aiCategoria ?? ""
        } ${i.aiPrioridad ?? ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }

      if (filtroCategoria && i.aiCategoria !== filtroCategoria) return false;
      if (filtroPrioridad && i.aiPrioridad !== filtroPrioridad) return false;
      if (filtroComunidad && i.comunidadNombre !== filtroComunidad)
        return false;

      if (filtroFecha) {
        const ymd = isoToYMD(i.fechaCreacion);
        if (ymd !== filtroFecha) return false;
      }

      return true;
    });
  }, [
    incidentes,
    busqueda,
    filtroCategoria,
    filtroPrioridad,
    filtroComunidad,
    filtroFecha,
  ]);

  // KPI counts
  const total = incidentesFiltrados.length;
  const alta = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "ALTA"
      ).length,
    [incidentesFiltrados]
  );
  const media = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "MEDIA"
      ).length,
    [incidentesFiltrados]
  );
  const baja = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "BAJA"
      ).length,
    [incidentesFiltrados]
  );
  const avgConf = useMemo(() => {
    const vals = incidentesFiltrados
      .map((x) => x.aiConfianza)
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [incidentesFiltrados]);

  // Line chart
  const lineData = useMemo(
    () => buildDailyIncidentes(incidentesFiltrados, 14),
    [incidentesFiltrados]
  );

  // Top categorías / comunidades
  const topCategorias = useMemo(() => {
    const by = new Map<string, number>();
    for (const i of incidentesFiltrados) {
      const k = (i.aiCategoria ?? "—").trim() || "—";
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    return [...by.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [incidentesFiltrados]);

  const topComunidades = useMemo(() => {
    const by = new Map<string, number>();
    for (const i of incidentesFiltrados) {
      const k = (i.comunidadNombre ?? "—").trim() || "—";
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    return [...by.entries()]
      .map(([comunidad, total]) => ({ comunidad, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [incidentesFiltrados]);

  const maxCategoria = useMemo(
    () => Math.max(1, ...topCategorias.map((x) => x.total)),
    [topCategorias]
  );

  const maxComunidad = useMemo(
    () => Math.max(1, ...topComunidades.map((x) => x.total)),
    [topComunidades]
  );

  // Donut prioridad (ALTA/MEDIA/BAJA/OTRO)
  const otro = Math.max(0, total - (alta + media + baja));
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const pAlta = pct(alta);
  const pMedia = pct(media);
  const pBaja = pct(baja);

  const donutBg =
    total > 0
      ? `conic-gradient(
          #ef4444 0% ${pAlta}%,
          #f59e0b ${pAlta}% ${pAlta + pMedia}%,
          #16a34a ${pAlta + pMedia}% ${pAlta + pMedia + pBaja}%,
          rgba(15,23,42,0.18) ${pAlta + pMedia + pBaja}% 100%
        )`
      : `conic-gradient(rgba(15,23,42,0.12) 0 100%)`;

  /* =====================
     EXPORT (PDF + EXCEL)
  ===================== */
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const lineChartRef = useRef<HTMLDivElement | null>(null);

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

  const canExport = incidentesFiltrados.length > 0;

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

  const captureLineChartPNG = async (): Promise<string | null> => {
    const node = lineChartRef.current;
    if (!node) return null;

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    return canvas.toDataURL("image/png", 1.0);
  };

  const buildExportRows = () =>
    incidentesFiltrados.map((i) => {
      const motivos = parseJsonArrayString(i.aiMotivos).join(" | ");
      const riesgos = parseJsonArrayString(i.aiRiesgos).join(" | ");
      return {
        ID: i.id ?? "—",
        Usuario: i.usuarioNombre ?? "—",
        Comunidad: i.comunidadNombre ?? "—",
        "Categoría IA": i.aiCategoria ?? "—",
        Prioridad: i.aiPrioridad ?? "—",
        Confianza:
          i.aiConfianza == null ? "—" : Number(i.aiConfianza).toFixed(2),
        Motivos: motivos || "—",
        Riesgos: riesgos || "—",
        Fecha: isoToYMD(i.fechaCreacion) || "—",
      };
    });

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 8 }, // ID
      { wch: 22 }, // Usuario
      { wch: 22 }, // Comunidad
      { wch: 22 }, // Categoria
      { wch: 12 }, // Prioridad
      { wch: 10 }, // Confianza
      { wch: 40 }, // Motivos
      { wch: 40 }, // Riesgos
      { wch: 12 }, // Fecha
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analisis IA");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_analisis_ia_${stamp}.xlsx`);
  };

  const exportPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 14;

    // Logo
    try {
      const logo = await toDataURL(logoSafeZone);
      const logoW = 40;
      const logoH = 40;
      doc.addImage(logo, "PNG", (pageW - logoW) / 2, 10, logoW, logoH);
    } catch {}

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Reporte de IA Análisis", pageW / 2, 58, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, pageW / 2, 65, {
      align: "center",
    });

    const startYTabla = 75;

    // Tabla
    autoTable(doc, {
      startY: startYTabla,
      head: [
        [
          "ID",
          "Usuario",
          "Comunidad",
          "Categoría IA",
          "Prioridad",
          "Conf.",
          "Motivos",
          "Riesgos",
          "Fecha",
        ],
      ],

      body: incidentesFiltrados.map((i) => {
        const motivos = parseJsonArrayString(i.aiMotivos).join(" | ");
        const riesgos = parseJsonArrayString(i.aiRiesgos).join(" | ");
        return [
          String(i.id ?? "—"),
          String(i.usuarioNombre ?? "—"),
          String(i.comunidadNombre ?? "—"),
          String(i.aiCategoria ?? "—"),
          String(i.aiPrioridad ?? "—"),
          i.aiConfianza == null ? "—" : Number(i.aiConfianza).toFixed(2),
          motivos || "—",
          riesgos || "—",
          isoToYMD(i.fechaCreacion) || "—",
        ];
      }),
      styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: marginX, right: marginX },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { cellWidth: 14 },
        5: { cellWidth: 10 },
        6: { cellWidth: 40 },
        7: { cellWidth: 40 },
        8: { cellWidth: 14 },
      },
    });

    // Gráfica al final
    try {
      const img = await captureLineChartPNG();
      if (img) {
        let y = (doc as any).lastAutoTable?.finalY ?? startYTabla + 20;
        y += 16;

        const w = pageW - marginX * 2;
        const h = 85;

        if (y + h + 18 > pageH) {
          doc.addPage();
          y = 28;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Gráfica: Incidentes analizados (14 días)", pageW / 2, y - 6, {
          align: "center",
        });
        doc.setFont("helvetica", "normal");

        const xChart = (pageW - w) / 2;
        doc.addImage(img, "PNG", xChart, y, w, h);
      }
    } catch {}

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_analisis_ia_${stamp}.pdf`);
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

        {/* SIDEBAR */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          closeSidebar={() => setSidebarOpen(false)}
          showCloseButton
        />

        {/* MAIN */}
        <main className="analisis-main">
          <motion.div
            className="analisis-panel card"
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
                  <div className="page-title">IA Análisis</div>

                  <div className={`search-pill-v2 ${busqueda ? "open" : ""}`}>
                    <span className="search-ico-v2" aria-hidden="true">
                      <Search size={18} />
                    </span>

                    <input
                      type="text"
                      className="search-input-v2"
                      placeholder="Buscar por usuario, comunidad o categoría..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
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

                <div className="topbar-actions" ref={exportRef}>
                  {/* ✅ EXPORTAR (igual pro que Reportes) */}
                  <button
                    className="action-pill action-pill-icon"
                    onClick={() => setOpenExport((v) => !v)}
                    disabled={!canExport}
                    title="Exportar análisis"
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
                    onClick={cargarIncidentes}
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

            {error && <p className="ui-error">{error}</p>}

            {/* FILTERS */}
            <div className="filters-row">
              <select
                className="filter-pill"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Categoría IA</option>
                {categoriasUnicas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="filter-pill"
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
              >
                <option value="">Prioridad IA</option>
                {prioridadesUnicas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                className="filter-pill"
                value={filtroComunidad}
                onChange={(e) => setFiltroComunidad(e.target.value)}
              >
                <option value="">Comunidad</option>
                {comunidadesUnicas.map((c) => (
                  <option key={c} value={c}>
                    {c}
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

            {/* KPIs (sin “posibles falsos”) */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Incidentes analizados</span>
                  <div className="kpi-icon kpi-total" aria-hidden="true">
                    <Brain size={24} />
                  </div>
                </div>
                <div className="kpi-value">{total}</div>
                <div className="kpi-sub">Con metadatos de IA</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Prioridad ALTA</span>
                  <div className="kpi-icon kpi-bad" aria-hidden="true">
                    <Flame size={24} />
                  </div>
                </div>
                <div className="kpi-value">{alta}</div>
                <div className="kpi-sub">Atención inmediata</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Prioridad MEDIA</span>
                  <div className="kpi-icon kpi-warn" aria-hidden="true">
                    <AlertTriangle size={24} />
                  </div>
                </div>
                <div className="kpi-value">{media}</div>
                <div className="kpi-sub">Revisar y coordinar</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Confianza promedio</span>
                  <div className="kpi-icon kpi-ok" aria-hidden="true">
                    <BadgeCheck size={24} />
                  </div>
                </div>
                <div className="kpi-value">
                  {avgConf ? avgConf.toFixed(2) : "—"}
                </div>
                <div className="kpi-sub">
                  Basado en incidentes con confianza
                </div>
              </div>
            </div>

            {/* Charts + Side card */}
            <div className="grid-2col">
              <section className="chart-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Incidentes analizados</div>
                    <div className="chart-sub-v2">Últimos 14 días</div>
                  </div>
                </div>

                {/*ref para exportar la gráfica */}
                <div className="line-chart-wrap5" ref={lineChartRef}>
                  <ResponsiveContainer width="100%" height={480}>
                    <LineChart
                      data={lineData}
                      margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="label" tickMargin={8} />
                      <YAxis tickMargin={8} allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(l) => `Día: ${l}`}
                        formatter={(v: any) => [v, "Incidentes"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="incidentes"
                        stroke="#f95150"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="side-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Prioridad IA</div>
                    <div className="chart-sub-v2">Distribución global</div>
                  </div>
                </div>

                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{ background: donutBg }}
                    aria-label="Donut prioridad"
                  >
                    <div className="donut-hole">
                      <div className="donut-total3">{total}</div>
                      <div className="donut-label3">Incidentes</div>
                    </div>
                  </div>

                  <div className="donut-legend">
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#ef4444" }}
                      />
                      <span className="donut-name">ALTA</span>
                      <span className="donut-val">{alta}</span>
                    </div>
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#f59e0b" }}
                      />
                      <span className="donut-name">MEDIA</span>
                      <span className="donut-val">{media}</span>
                    </div>
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#16a34a" }}
                      />
                      <span className="donut-name">BAJA</span>
                      <span className="donut-val">{baja}</span>
                    </div>
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "rgba(15,23,42,0.28)" }}
                      />
                      <span className="donut-name">OTRO</span>
                      <span className="donut-val">{otro}</span>
                    </div>
                  </div>
                </div>

                {/* ===============================
                             Top categorías
                  ================================ */}
                <div className="toplist">
                  <div className="toplist-title">Top categorías</div>
                  <div className="toplist-sub">Frecuencia por categoría IA</div>

                  <div className="toplist-items">
                    {topCategorias.length === 0 ? (
                      <div className="toplist-empty">Sin datos</div>
                    ) : (
                      topCategorias.map((c) => (
                        <div
                          className="toplist-row"
                          key={c.categoria}
                          style={{
                            ["--p" as any]: `${
                              (c.total / maxCategoria) * 100
                            }%`,
                          }}
                        >
                          <span className="toplist-name" title={c.categoria}>
                            {c.categoria}
                          </span>
                          <span className="toplist-val">{c.total}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ===============================
                          Top comunidades
                  ================================ */}
                <div className="toplist">
                  <div className="toplist-title">Top comunidades</div>
                  <div className="toplist-sub">Frecuencia por comunidad</div>

                  <div className="toplist-items">
                    {topComunidades.length === 0 ? (
                      <div className="toplist-empty">Sin datos</div>
                    ) : (
                      topComunidades.map((c) => (
                        <div
                          className="toplist-row"
                          key={c.comunidad}
                          style={{
                            ["--p" as any]: `${
                              (c.total / maxComunidad) * 100
                            }%`,
                          }}
                        >
                          <span className="toplist-name" title={c.comunidad}>
                            {c.comunidad}
                          </span>
                          <span className="toplist-val">{c.total}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* TABLA (sin columna "Falso") */}
            <section className="tabla-card">
              <div className="tabla-wrap">
                <table className="tabla-analisis">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Comunidad</th>
                      <th>Categoría IA</th>
                      <th>Prioridad</th>
                      <th>Confianza</th>
                      <th>Motivos</th>
                      <th>Riesgos</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9}>Cargando análisis IA...</td>
                      </tr>
                    ) : incidentesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          No se encontraron incidentes con IA.
                        </td>
                      </tr>
                    ) : (
                      incidentesFiltrados.map((i) => {
                        const motivos = parseJsonArrayString(i.aiMotivos);
                        const riesgos = parseJsonArrayString(i.aiRiesgos);

                        return (
                          <tr key={i.id}>
                            <td className="td-center">{i.id}</td>
                            <td title={i.usuarioNombre ?? "-"}>
                              {i.usuarioNombre ?? "-"}
                            </td>
                            <td title={i.comunidadNombre ?? "-"}>
                              {i.comunidadNombre ?? "-"}
                            </td>
                            <td title={i.aiCategoria ?? "-"}>
                              {i.aiCategoria ?? "-"}
                            </td>
                            <td className="td-center">
                              <span
                                className={getBadgePrioridad(i.aiPrioridad)}
                              >
                                {i.aiPrioridad ?? "-"}
                              </span>
                            </td>
                            <td className="td-center">
                              {i.aiConfianza == null
                                ? "-"
                                : i.aiConfianza.toFixed(2)}
                            </td>

                            <td className="cell-wrap">
                              {motivos.length === 0 ? (
                                "-"
                              ) : (
                                <ul className="mini-list">
                                  {motivos.slice(0, 3).map((m, idx) => (
                                    <li key={idx}>{m}</li>
                                  ))}
                                  {motivos.length > 3 && (
                                    <li>+{motivos.length - 3} más...</li>
                                  )}
                                </ul>
                              )}
                            </td>

                            <td className="cell-wrap">
                              {riesgos.length === 0 ? (
                                "-"
                              ) : (
                                <ul className="mini-list">
                                  {riesgos.slice(0, 3).map((r, idx) => (
                                    <li key={idx}>{r}</li>
                                  ))}
                                  {riesgos.length > 3 && (
                                    <li>+{riesgos.length - 3} más...</li>
                                  )}
                                </ul>
                              )}
                            </td>

                            <td className="td-center">
                              {isoToYMD(i.fechaCreacion) || "-"}
                            </td>
                          </tr>
                        );
                      })
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
