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
  LayoutDashboard,
  Table2,
  LineChart as LineChartIcon,
  ToggleLeft,
  ToggleRight,
  Eye,
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
  days = 14,
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

  const tablaWrapRef = useRef<HTMLDivElement | null>(null);

  // 🔹 DATA REAL
  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // 🔹 FILTROS
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  // ===== refs (export charts) =====
  const lineChartRef = useRef<HTMLDivElement | null>(null);

  // ===================== MODAL DETALLE (VER) =====================
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleItem, setDetalleItem] = useState<IncidenteResponseDTO | null>(
    null,
  );

  const openDetalle = (item: IncidenteResponseDTO) => {
    setDetalleItem(item);
    setDetalleOpen(true);
  };

  const closeDetalle = () => {
    setDetalleOpen(false);
    setDetalleItem(null);
  };

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
    const el = tablaWrapRef.current;
    if (!el) return;

    const BREAKPOINT = 1100; // 👈 el mismo que usas en CSS (max-width: 1100px)

    const resetScrollIfDesktop = () => {
      const isDesktop = window.innerWidth > BREAKPOINT;
      if (isDesktop) {
        // ✅ fuerza volver a la izquierda (y arriba si quieres)
        el.scrollLeft = 0;
        // el.scrollTop = 0; // opcional
      }
    };

    // 1) reset inmediato si ya estás en desktop
    resetScrollIfDesktop();

    // 2) reset cada vez que cambie el tamaño de la ventana (debounced)
    let t: number | null = null;
    const onResize = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(resetScrollIfDesktop, 80);
    };

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (t) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    cargarIncidentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Solo con IA real
  const tieneIA = (i: IncidenteResponseDTO) =>
    i.aiCategoria != null ||
    i.aiPrioridad != null ||
    i.aiConfianza != null ||
    (i.aiMotivos != null && i.aiMotivos !== "") ||
    (i.aiRiesgos != null && i.aiRiesgos !== "");

  // 🔹 LISTAS ÚNICAS PARA SELECTS
  const categoriasUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiCategoria)
            .filter((x): x is string => !!x && x.trim() !== ""),
        ),
      ),
    [incidentes],
  );

  const prioridadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.aiPrioridad)
            .filter((x): x is string => !!x && x.trim() !== ""),
        ),
      ),
    [incidentes],
  );

  const comunidadesUnicas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentes
            .map((i) => i.comunidadNombre)
            .filter((x): x is string => !!x && x.trim() !== ""),
        ),
      ),
    [incidentes],
  );

  // 🔹 FILTRADO (solo con IA)
  const incidentesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();

    return incidentes.filter((i) => {
      if (!tieneIA(i)) return false;

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

  // KPI counts (siempre basados en filtros en pantalla)
  const total = incidentesFiltrados.length;

  const alta = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "ALTA",
      ).length,
    [incidentesFiltrados],
  );
  const media = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "MEDIA",
      ).length,
    [incidentesFiltrados],
  );
  const baja = useMemo(
    () =>
      incidentesFiltrados.filter(
        (x) => (x.aiPrioridad ?? "").toUpperCase() === "BAJA",
      ).length,
    [incidentesFiltrados],
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
    [incidentesFiltrados],
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
    [topCategorias],
  );

  const maxComunidad = useMemo(
    () => Math.max(1, ...topComunidades.map((x) => x.total)),
    [topComunidades],
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
        EXPORT PRO (MODAL)
  ====================== */
  type ExportFormato = "pdf" | "excel";
  type ExportContenido = "solo_tabla" | "completo" | "solo_registros";

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormato, setExportFormato] = useState<ExportFormato>("pdf");
  const [exportContenido, setExportContenido] =
    useState<ExportContenido>("completo");

  // usar filtros actuales (busqueda/selects/fecha)
  const [exportUsarFiltros, setExportUsarFiltros] = useState(true);

  // ✅ KPIs SOLO en “completo”
  const [exportIncluirKPIs, setExportIncluirKPIs] = useState(true);

  const kpiHabilitado = exportContenido === "completo";

  const setContenidoSeguro = (next: ExportContenido) => {
    setExportContenido(next);
    if (next !== "completo") setExportIncluirKPIs(false);
  };

  const getExportSource = () => {
    if (exportUsarFiltros) return incidentesFiltrados;
    return incidentes.filter(tieneIA);
  };

  const canExport = getExportSource().length > 0;

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

  const buildExportRows = (source: IncidenteResponseDTO[]) =>
    source.map((i) => {
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

  const exportExcelPro = () => {
    const source = getExportSource();

    const incluirTabla =
      exportContenido === "solo_tabla" || exportContenido === "completo";
    const incluirRegistros =
      exportContenido === "solo_registros" || exportContenido === "completo";

    const incluirKPIs = exportContenido === "completo" && exportIncluirKPIs;

    const wb = XLSX.utils.book_new();

    // 1) TABLA
    if (incluirTabla) {
      const rows = buildExportRows(source);
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

      XLSX.utils.book_append_sheet(wb, ws, "Analisis_IA");
    }

    // 2) KPIs + ESTADO GLOBAL (solo completo)
    if (incluirKPIs) {
      const totalSafe = total || 1;
      const pctRow = (n: number) => `${((n / totalSafe) * 100).toFixed(1)}%`;

      const wsResumen = XLSX.utils.json_to_sheet([
        { KPI: "Incidentes analizados", Valor: total },
        { KPI: "Prioridad ALTA", Valor: alta },
        { KPI: "Prioridad MEDIA", Valor: media },
        { KPI: "Prioridad BAJA", Valor: baja },
        { KPI: "OTRO", Valor: otro },
        {
          KPI: "Confianza promedio",
          Valor: avgConf ? avgConf.toFixed(2) : "—",
        },
        {
          KPI: "Filtro aplicado",
          Valor: exportUsarFiltros
            ? "Sí (filtros actuales)"
            : "No (todos con IA)",
        },
        { KPI: "Registros exportados", Valor: source.length },
      ]);
      wsResumen["!cols"] = [{ wch: 28 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const wsEstado = XLSX.utils.json_to_sheet([
        { Prioridad: "ALTA", Cantidad: alta, Porcentaje: pctRow(alta) },
        { Prioridad: "MEDIA", Cantidad: media, Porcentaje: pctRow(media) },
        { Prioridad: "BAJA", Cantidad: baja, Porcentaje: pctRow(baja) },
        { Prioridad: "OTRO", Cantidad: otro, Porcentaje: pctRow(otro) },
      ]);
      wsEstado["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEstado, "Estado_global");
    }

    // 3) REGISTROS 14D (no recorta fechas)
    if (incluirRegistros) {
      const wsChart = XLSX.utils.json_to_sheet(
        lineData.map((p) => ({
          Dia: p.label,
          Incidentes: p.incidentes,
        })),
      );
      wsChart["!cols"] = [{ wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsChart, "Incidentes_14_dias");
    }

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_analisis_ia_${stamp}.xlsx`);
  };

  const exportPDFPro = async () => {
    const source = getExportSource();

    const incluirTabla =
      exportContenido === "solo_tabla" || exportContenido === "completo";
    const incluirRegistros =
      exportContenido === "solo_registros" || exportContenido === "completo";
    const incluirKPIs = exportContenido === "completo" && exportIncluirKPIs;

    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // logo centrado
    const logoSize = 40;
    const logoX = (pageW - logoSize) / 2;
    const logoY = 10;

    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);
    } catch {}

    const titleY = logoY + logoSize + 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      exportContenido === "solo_tabla"
        ? "Reporte IA Análisis (Solo tabla)"
        : exportContenido === "solo_registros"
          ? "Reporte IA Análisis (Solo registros)"
          : "Reporte IA Análisis (Completo)",
      pageW / 2,
      titleY,
      { align: "center" },
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generado: ${new Date().toLocaleString("es-EC")}`,
      pageW / 2,
      titleY + 8,
      { align: "center" },
    );

    let cursorY = titleY + 18;

    // 1) RESUMEN + ESTADO GLOBAL (solo completo)
    if (incluirKPIs) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 6;
      autoTable(doc, {
        startY: cursorY,
        head: [["Resumen", "Valor"]],
        body: [
          ["Incidentes analizados", String(total)],
          ["ALTA", String(alta)],
          ["MEDIA", String(media)],
          ["BAJA", String(baja)],
          ["OTRO", String(otro)],
          ["Confianza promedio", avgConf ? avgConf.toFixed(2) : "—"],
          [
            "Filtro aplicado",
            exportUsarFiltros ? "Sí (filtros actuales)" : "No (todos con IA)",
          ],
          ["Registros exportados", String(source.length)],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
      });

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        8) as number;

      const totalSafe = total || 1;
      const pctRow = (n: number) => `${Math.round((n / totalSafe) * 100)}%`;

      autoTable(doc, {
        startY: cursorY,
        head: [["Prioridad", "Cantidad", "Porcentaje"]],
        body: [
          ["ALTA", String(alta), pctRow(alta)],
          ["MEDIA", String(media), pctRow(media)],
          ["BAJA", String(baja), pctRow(baja)],
          ["OTRO", String(otro), pctRow(otro)],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
        },
      });

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        10) as number;
    }

    // 2) TABLA PRINCIPAL (si aplica)
    if (incluirTabla) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tabla de reportes IA", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 6;
      autoTable(doc, {
        startY: cursorY,
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
        body: source.map((i) => {
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
        styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 10, right: 10 },
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

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        10) as number;
    }

    // 3) GRÁFICA + TABLA 14D (si aplica)
    if (incluirRegistros) {
      if (cursorY + 95 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Incidentes analizados (últimos 14 días)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 6;

      try {
        const img = await captureLineChartPNG();
        if (img) {
          const imgW = pageW - 28;
          const imgH = 72;
          const x = (pageW - imgW) / 2;
          doc.addImage(img, "PNG", x, cursorY, imgW, imgH);
          cursorY += imgH + 6;
        }
      } catch {}

      autoTable(doc, {
        startY: cursorY,
        head: [["Día", "Incidentes"]],
        body: lineData.map((p) => [p.label, String(p.incidentes)]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 40, halign: "center" },
        },
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_analisis_ia_${stamp}.pdf`);
  };

  const exportNow = async () => {
    if (!canExport) return;

    if (exportFormato === "excel") {
      exportExcelPro();
    } else {
      await exportPDFPro();
    }

    setExportOpen(false);
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

                <div className="topbar-actions">
                  {/* ✅ EXPORTAR (MODAL PRO) */}
                  <button
                    className="action-pill action-pill-icon"
                    onClick={() => setExportOpen(true)}
                    disabled={!canExport}
                    title="Exportar análisis"
                    type="button"
                    aria-label="Exportar"
                  >
                    <Download size={18} />
                    Exportar
                  </button>

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

            {/* KPIs */}
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
              <section className="table-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Reportes con IA</div>
                    <div className="chart-sub-v2">Listado (compacto)</div>
                  </div>
                </div>

                <div
                  ref={tablaWrapRef}
                  className="tabla-wrap tabla-wrap-compact"
                >
                  <table className="tabla-analisis tabla-compact">
                    <thead>
                      <tr>
                        <th className="col-id">ID</th>
                        <th className="col-usu">Usuario</th>
                        <th className="col-com">Comunidad</th>
                        <th className="col-cate">Categoría IA</th>
                        <th className="col-prio">Prioridad</th>
                        <th className="col-ver">Ver</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6}>Cargando análisis IA...</td>
                        </tr>
                      ) : incidentesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            No se encontraron incidentes con IA.
                          </td>
                        </tr>
                      ) : (
                        incidentesFiltrados.map((i) => (
                          <tr key={i.id}>
                            <td className="td-center">{i.id ?? "-"}</td>

                            <td
                              className="cell-ellipsis"
                              title={i.usuarioNombre ?? "-"}
                            >
                              {i.usuarioNombre ?? "-"}
                            </td>

                            <td
                              className="cell-ellipsis"
                              title={i.comunidadNombre ?? "-"}
                            >
                              {i.comunidadNombre ?? "-"}
                            </td>

                            <td
                              className="cell-ellipsis"
                              title={i.aiCategoria ?? "-"}
                            >
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
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => openDetalle(i)}
                                aria-label={`Ver detalle del incidente ${i.id}`}
                                title="Ver detalle"
                              >
                                <Eye size={16} />
                                <span>Ver</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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

                {/* Top categorías */}
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
                            ["--p" as any]: `${(c.total / maxCategoria) * 100}%`,
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

                {/* Top comunidades */}
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
                            ["--p" as any]: `${(c.total / maxComunidad) * 100}%`,
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

            {/* GRÁFICA (ABAJO) */}
            <section className="chart-card-v2 card chart-card-bottom">
              <div className="chart-head">
                <div>
                  <div className="chart-title-v2">Incidentes analizados</div>
                  <div className="chart-sub-v2">Últimos 14 días</div>
                </div>
              </div>

              {/* ref para exportar la gráfica */}
              <div className="line-chart-wrap5" ref={lineChartRef}>
                <ResponsiveContainer width="100%" height={420}>
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

            <p className="panel-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </motion.div>
        </main>
      </div>

      {/* =========================
      MODAL EXPORTAR
========================== */}
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            className="anx-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setExportOpen(false)}
          >
            <motion.div
              className="anx-modal-card anx-export-card"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Exportar reporte"
            >
              <div className="anx-modal-head">
                <div>
                  <div className="anx-modal-title">Exportar</div>
                  <div className="anx-modal-sub">
                    Selecciona el contenido que deseas exportar. El reporte
                    conservará el logotipo, el encabezado y el formato actual.
                  </div>
                </div>

                <button
                  type="button"
                  className="anx-modal-x"
                  onClick={() => setExportOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="anx-export-grid">
                {/* Formato */}
                <div className="anx-export-col">
                  <div className="anx-export-title">
                    <span className="anx-dot" />
                    Formato
                  </div>

                  <button
                    type="button"
                    className={`anx-export-item ${exportFormato === "pdf" ? "active" : ""}`}
                    onClick={() => setExportFormato("pdf")}
                  >
                    <span className="anx-export-ico">
                      <FileText size={18} />
                    </span>
                    <div>
                      <div className="anx-export-name">PDF</div>
                      <div className="anx-modal-sub" style={{ marginTop: 2 }}>
                        Ideal para impresión
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`anx-export-item ${exportFormato === "excel" ? "active" : ""}`}
                    onClick={() => setExportFormato("excel")}
                  >
                    <span className="anx-export-ico">
                      <FileSpreadsheet size={18} />
                    </span>
                    <div>
                      <div className="anx-export-name">Excel</div>
                      <div className="anx-modal-sub" style={{ marginTop: 2 }}>
                        Análisis y filtros
                      </div>
                    </div>
                  </button>
                </div>

                {/* Contenido */}
                <div className="anx-export-col">
                  <div className="anx-export-title">
                    <span className="anx-dot" />
                    Contenido
                  </div>

                  <button
                    type="button"
                    className={`anx-export-item ${exportContenido === "completo" ? "active" : ""}`}
                    onClick={() => setContenidoSeguro("completo")}
                  >
                    <span className="anx-export-ico">
                      <LayoutDashboard size={18} />
                    </span>
                    <div>
                      <div className="anx-export-name">Reporte completo</div>
                      <div className="anx-modal-sub" style={{ marginTop: 2 }}>
                        Resumen + estado global + tabla + registros
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`anx-export-item ${exportContenido === "solo_tabla" ? "active" : ""}`}
                    onClick={() => setContenidoSeguro("solo_tabla")}
                  >
                    <span className="anx-export-ico">
                      <Table2 size={18} />
                    </span>
                    <div>
                      <div className="anx-export-name">Solo tabla</div>
                      <div className="anx-modal-sub" style={{ marginTop: 2 }}>
                        Exporta únicamente la tabla principal
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`anx-export-item ${exportContenido === "solo_registros" ? "active" : ""}`}
                    onClick={() => setContenidoSeguro("solo_registros")}
                  >
                    <span className="anx-export-ico">
                      <LineChartIcon size={18} />
                    </span>
                    <div>
                      <div className="anx-export-name">Solo registros</div>
                      <div className="anx-modal-sub" style={{ marginTop: 2 }}>
                        Gráfica + tabla completa de 14 días
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Opciones */}
              <div className="anx-export-options">
                <div className="anx-export-title">
                  <span className="anx-dot" />
                  Opciones
                </div>

                <button
                  type="button"
                  className={`anx-opt ${exportUsarFiltros ? "on" : ""}`}
                  onClick={() => setExportUsarFiltros((v) => !v)}
                >
                  <div className="anx-opt-text">
                    Usar filtros actuales <br />
                    <span
                      style={{ fontWeight: 700, color: "rgba(15,23,42,0.62)" }}
                    >
                      Respeta búsqueda, selects y fecha actuales
                    </span>
                  </div>

                  <span
                    className={`anx-switch ${exportUsarFiltros ? "on" : ""}`}
                  >
                    {exportUsarFiltros ? (
                      <ToggleRight size={22} />
                    ) : (
                      <ToggleLeft size={22} />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`anx-opt ${exportIncluirKPIs && kpiHabilitado ? "on" : ""}`}
                  onClick={() =>
                    kpiHabilitado && setExportIncluirKPIs((v) => !v)
                  }
                  disabled={!kpiHabilitado}
                  title={
                    kpiHabilitado
                      ? "Incluir KPIs"
                      : "Solo disponible en Reporte completo"
                  }
                  style={{ opacity: kpiHabilitado ? 1 : 0.7 }}
                >
                  <div className="anx-opt-text">
                    Incluir KPIs / Resumen <br />
                    <span
                      style={{ fontWeight: 700, color: "rgba(15,23,42,0.62)" }}
                    >
                      Solo disponible en “Reporte completo”
                    </span>
                  </div>

                  <span
                    className={`anx-switch ${exportIncluirKPIs && kpiHabilitado ? "on" : ""}`}
                  >
                    {exportIncluirKPIs && kpiHabilitado ? (
                      <ToggleRight size={22} />
                    ) : (
                      <ToggleLeft size={22} />
                    )}
                  </span>
                </button>

                <div className="anx-export-count">
                  Registros a exportar: {getExportSource().length} de{" "}
                  {incidentes.filter(tieneIA).length}
                </div>
              </div>

              <div className="anx-export-footer">
                <button
                  type="button"
                  className="anx-btn-light"
                  onClick={() => setExportOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="anx-btn-accent"
                  onClick={exportNow}
                  disabled={!canExport}
                  title={!canExport ? "No hay datos para exportar" : "Exportar"}
                >
                  Exportar ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================= MODAL DETALLE (VER) ========================== */}
      <AnimatePresence>
        {detalleOpen && detalleItem && (
          <motion.div
            className="anx-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={closeDetalle}
          >
            <motion.div
              className="anx-modal-card anx-detail-card"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Detalle del análisis IA"
            >
              <div className="anx-modal-body">
                <div className="anx-modal-head">
                  <div>
                    <div className="anx-modal-title">Detalle del reporte</div>
                    <div className="anx-modal-sub">
                      Información completa del análisis IA y del incidente
                      seleccionado.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="anx-modal-x"
                    onClick={closeDetalle}
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="anx-detail-grid">
                  {/* Bloque: Principales */}
                  <div className="anx-detail-block">
                    <div className="anx-detail-title">Datos principales</div>

                    <div className="anx-kv">
                      <div className="anx-kv-row">
                        <div className="anx-k">ID</div>
                        <div className="anx-v">{detalleItem.id ?? "—"}</div>
                      </div>

                      <div className="anx-kv-row">
                        <div className="anx-k">Usuario</div>
                        <div className="anx-v">
                          {detalleItem.usuarioNombre ?? "—"}
                        </div>
                      </div>

                      <div className="anx-kv-row">
                        <div className="anx-k">Comunidad</div>
                        <div className="anx-v">
                          {detalleItem.comunidadNombre ?? "—"}
                        </div>
                      </div>

                      <div className="anx-kv-row">
                        <div className="anx-k">Fecha</div>
                        <div className="anx-v">
                          {isoToYMD(detalleItem.fechaCreacion) || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloque: IA */}
                  <div className="anx-detail-block">
                    <div className="anx-detail-title">Análisis IA</div>

                    <div className="anx-kv">
                      <div className="anx-kv-row">
                        <div className="anx-k">Categoría IA</div>
                        <div className="anx-v">
                          {detalleItem.aiCategoria ?? "—"}
                        </div>
                      </div>

                      <div className="anx-kv-row">
                        <div className="anx-k">Prioridad</div>
                        <div className="anx-v">
                          <span
                            className={getBadgePrioridad(
                              detalleItem.aiPrioridad,
                            )}
                          >
                            {detalleItem.aiPrioridad ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="anx-kv-row">
                        <div className="anx-k">Confianza</div>
                        <div className="anx-v">
                          {detalleItem.aiConfianza == null
                            ? "—"
                            : Number(detalleItem.aiConfianza).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloque: Motivos */}
                  <div className="anx-detail-block">
                    <div className="anx-detail-title">Motivos</div>
                    {parseJsonArrayString(detalleItem.aiMotivos).length ===
                    0 ? (
                      <div className="anx-empty">—</div>
                    ) : (
                      <ul className="anx-list">
                        {parseJsonArrayString(detalleItem.aiMotivos).map(
                          (m, idx) => (
                            <li key={idx}>{m}</li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Bloque: Riesgos */}
                  <div className="anx-detail-block">
                    <div className="anx-detail-title">Riesgos</div>
                    {parseJsonArrayString(detalleItem.aiRiesgos).length ===
                    0 ? (
                      <div className="anx-empty">—</div>
                    ) : (
                      <ul className="anx-list">
                        {parseJsonArrayString(detalleItem.aiRiesgos).map(
                          (r, idx) => (
                            <li key={idx}>{r}</li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="anx-export-footer">
                  <button
                    type="button"
                    className="anx-btn-light"
                    onClick={closeDetalle}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
