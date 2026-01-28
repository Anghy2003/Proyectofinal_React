// src/pages/Reportes.tsx
import "../styles/reporte.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_SafeZone2.webp";
/*import iconEliminar from "../assets/icon_eliminar2.svg";*/
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  reportesService,
  type Reporte,
  type EstadoReporte,
} from "../services/reportes.service";

// Export libs
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

//Animaciones + UI pro
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
  LayoutDashboard,
  Table2,
  LineChart as LineChartIcon,
  ToggleLeft,
  ToggleRight,
  Eye,
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

export default function Reportes() {
  // sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔹 DATA REAL
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  //buscador topbar
  const [busqueda, setBusqueda] = useState("");

  // 🔹 ESTADOS DE LOS FILTROS
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroComunidad, setFiltroComunidad] = useState<string>("");
  const [filtroFecha, setFiltroFecha] = useState<string>(""); // yyyy-mm-dd

  // Gráfico (día/mes/año)
  const [granularity, setGranularity] = useState<Granularity>("mes");

  // refs (export charts)
  const barChartRef = useRef<HTMLDivElement | null>(null);

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

  // =====================
  // MODAL "VER" (detalle)
  // =====================
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] =
    useState<Reporte | null>(null);

  const abrirDetalle = (r: Reporte) => {
    setReporteSeleccionado(r);
    setDetalleOpen(true);
  };

  const cerrarDetalle = () => {
    setDetalleOpen(false);
    // opcional: limpia al cerrar animación
    setTimeout(() => setReporteSeleccionado(null), 150);
  };

  useEffect(() => {
    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 901) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) =>
    setBusqueda(e.target.value);

  // 🔹 LISTAS ÚNICAS PARA LOS SELECT
  const tiposUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.tipo))).filter(Boolean),
    [reportes],
  );

  const estadosUnicos = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.estado))).filter(Boolean),
    [reportes],
  );

  const comunidadesUnicas = useMemo(
    () => Array.from(new Set(reportes.map((r) => r.comunidad))).filter(Boolean),
    [reportes],
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
  // KPIs (basados en filtros en pantalla)
  // =====================
  const kpiTotal = reportesFiltrados.length;

  const kpiAtendidos = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Atendido").length,
    [reportesFiltrados],
  );
  const kpiPendientes = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Pendiente").length,
    [reportesFiltrados],
  );
  const kpiFalsos = useMemo(
    () => reportesFiltrados.filter((r) => r.estado === "Falso positivo").length,
    [reportesFiltrados],
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
  // ELIMINAR
  // =====================
{/*  const eliminarReporte = async (id: string) => {
    const ok = window.confirm("¿Seguro que deseas eliminar este reporte?");
    if (!ok) return;

    try {
      await reportesService.eliminar(id);
      setReportes((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar el reporte");
    }
  };*/} 

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

  // KPIs SOLO en “completo”
  const [exportIncluirKPIs, setExportIncluirKPIs] = useState(true);
  const kpiHabilitado = exportContenido === "completo";

  const setContenidoSeguro = (next: ExportContenido) => {
    setExportContenido(next);
    if (next !== "completo") setExportIncluirKPIs(false);
  };

  const getExportSource = () => {
    if (exportUsarFiltros) return reportesFiltrados;
    return reportes;
  };

  const canExport = getExportSource().length > 0;

  const buildExportRows = (source: Reporte[]) =>
    source.map((r) => ({
      ID: r.id ?? "—",
      Usuario: r.usuario ?? "—",
      Tipo: r.tipo ?? "—",
      Comunidad: r.comunidad ?? "—",
      Fecha: r.fecha ?? "—",
      Estado: r.estado ?? "—",
    }));

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

  const captureBarChartPNG = async (): Promise<string | null> => {
    const node = barChartRef.current;
    if (!node) return null;

    node.classList.add("export-capture");

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,

        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector(
            ".export-capture",
          ) as HTMLElement | null;
          if (el) {
            el.style.overflow = "visible";
            el.style.borderRadius = "0";
            el.style.paddingBottom = "26px";
          }
        },
      });

      return canvas.toDataURL("image/png", 1.0);
    } finally {
      node.classList.remove("export-capture");
    }
  };

  // BarData para export (si no usas filtros, recalcula con source)
  const buildBarDataFrom = (source: Reporte[], g: Granularity) => {
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

      if (g === "dia") {
        const k = `${y}-${m}-${day}`;
        return { groupKey: k, label: `${day}/${m}`, sortKey: d.getTime() };
      }
      if (g === "mes") {
        const k = `${y}-${m}`;
        const sort = new Date(y, d.getMonth(), 1).getTime();
        return { groupKey: k, label: `${m}/${y}`, sortKey: sort };
      }
      const k = `${y}`;
      const sort = new Date(y, 0, 1).getTime();
      return { groupKey: k, label: `${y}`, sortKey: sort };
    };

    for (const r of source) {
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
  };

  function buildTopComunidadesDonut(source: Reporte[], topN = 5) {
    const counts = new Map<string, number>();

    for (const r of source) {
      const k = (r.comunidad || "Sin comunidad").trim() || "Sin comunidad";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const restSum = rest.reduce((acc, x) => acc + x.value, 0);

    if (restSum > 0) top.push({ name: "Otras", value: restSum });
    return top;
  }

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
        { wch: 10 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    }

    // 2) KPIs + Estado global (solo completo)
    if (incluirKPIs) {
      const total = source.length;
      const atendidos = source.filter((r) => r.estado === "Atendido").length;
      const pendientes = source.filter((r) => r.estado === "Pendiente").length;
      const falsos = source.filter((r) => r.estado === "Falso positivo").length;

      const totalSafe = total || 1;
      const pct = (n: number) => `${((n / totalSafe) * 100).toFixed(1)}%`;

      const topCom = buildTopComunidadesDonut(source, 5);

      const aoa: any[][] = [
        ["Resumen", ""],
        ["Reportes (total)", total],
        ["Atendidos", atendidos],
        ["Pendientes", pendientes],
        ["Falsos positivos", falsos],
        [
          "Filtro aplicado",
          exportUsarFiltros ? "Sí (filtros actuales)" : "No (todos)",
        ],
        ["Granularidad gráfica", granularity],
        ["Registros exportados", source.length],
        [],
        ["Estado global", ""],
        ["Estado", "Cantidad", "Porcentaje"],
        ["Atendido", atendidos, pct(atendidos)],
        ["Pendiente", pendientes, pct(pendientes)],
        ["Falso positivo", falsos, pct(falsos)],
        [],
        ["Reportes por comunidad (Top 5 + Otras)", ""],
        ["Comunidad", "Reportes"],
        ...(topCom.length ? topCom.map((x) => [x.name, x.value]) : [["—", 0]]),
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(aoa);
      wsResumen["!cols"] = [{ wch: 34 }, { wch: 20 }, { wch: 14 }];

      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    }

    // 3) REGISTROS (Gráfica)
    if (incluirRegistros) {
      const bd = buildBarDataFrom(source, granularity);
      const wsChart = XLSX.utils.json_to_sheet(
        bd.map((p) => ({
          Periodo: p.label,
          Atendido: p.atendido,
          Pendiente: p.pendiente,
          "Falso positivo": p.falso,
          Total: p.atendido + p.pendiente + p.falso,
        })),
      );
      wsChart["!cols"] = [
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsChart, "Serie_grafica");
    }

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_reportes_${stamp}.xlsx`);
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
        ? "Reporte Reportes (Solo tabla)"
        : exportContenido === "solo_registros"
          ? `Reporte Reportes (Solo registros - ${granularity.toUpperCase()})`
          : "Reporte Reportes (Completo)",
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
      const total = source.length;
      const atendidos = source.filter((r) => r.estado === "Atendido").length;
      const pendientes = source.filter((r) => r.estado === "Pendiente").length;
      const falsos = source.filter((r) => r.estado === "Falso positivo").length;

      doc.setFont("helvetica", "bold");
      doc.text("Resumen", pageW / 2, cursorY, { align: "center" });
      doc.setFont("helvetica", "normal");
      cursorY += 6;
      autoTable(doc, {
        startY: cursorY,
        head: [["Resumen", "Valor"]],
        body: [
          ["Reportes (total)", String(total)],
          ["Atendidos", String(atendidos)],
          ["Pendientes", String(pendientes)],
          ["Falsos positivos", String(falsos)],
          [
            "Filtro aplicado",
            exportUsarFiltros ? "Sí (filtros actuales)" : "No (todos)",
          ],
          ["Granularidad gráfica", granularity],
          ["Registros exportados", String(source.length)],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
      });

      //Después del autoTable de Estado global
      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        8) as number;

      // ===== Tabla: Reportes por comunidad (Top 5 + Otras) =====
      const topCom = buildTopComunidadesDonut(source, 5);

      // salto de página si no alcanza
      if (cursorY + 55 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Reportes por comunidad (Top 5 + Otras)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 5;

      autoTable(doc, {
        startY: cursorY,
        head: [["Comunidad", "Reportes"]],
        body: topCom.length
          ? topCom.map((x) => [x.name, String(x.value)])
          : [["—", "0"]],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 30, halign: "center" },
        },
      });

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        10) as number;

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        8) as number;

      const totalSafe = total || 1;
      const pct = (n: number) => `${Math.round((n / totalSafe) * 100)}%`;

      autoTable(doc, {
        startY: cursorY,
        head: [["Estado", "Cantidad", "Porcentaje"]],
        body: [
          ["Atendido", String(atendidos), pct(atendidos)],
          ["Pendiente", String(pendientes), pct(pendientes)],
          ["Falso positivo", String(falsos), pct(falsos)],
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

    // 2) TABLA PRINCIPAL
    if (incluirTabla) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tabla de reportes", pageW / 2, cursorY, { align: "center" });
      doc.setFont("helvetica", "normal");
      cursorY += 6;
      autoTable(doc, {
        startY: cursorY,
        head: [["ID", "Usuario", "Tipo", "Comunidad", "Fecha", "Estado"]],
        body: source.map((r) => [
          r.id ?? "—",
          r.usuario ?? "—",
          r.tipo ?? "—",
          r.comunidad ?? "—",
          r.fecha ?? "—",
          r.estado ?? "—",
        ]),
        styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 34 },
          2: { cellWidth: 34 },
          3: { cellWidth: 38 },
          4: { cellWidth: 22 },
          5: { cellWidth: 28 },
        },
      });

      cursorY = ((((doc as any).lastAutoTable?.finalY as number) ?? cursorY) +
        10) as number;
    }

    // 3) GRÁFICA + TABLA SERIE
    if (incluirRegistros) {
      if (cursorY + 95 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Gráfica por ${granularity.toUpperCase()} (según selección)`,
        pageW / 2,
        cursorY,
        { align: "center" },
      );
      doc.setFont("helvetica", "normal");
      cursorY += 6;

      try {
        const img = await captureBarChartPNG();
        if (img) {
          const imgW = pageW - 28;
          const x = (pageW - imgW) / 2;

          const props = doc.getImageProperties(img);
          let imgH = (props.height * imgW) / props.width;

          const marginBottom = 14;
          const needed = imgH + 6;
          if (cursorY + needed > pageH - marginBottom) {
            doc.addPage();
            cursorY = 18;
          }
          const maxH = pageH - marginBottom - cursorY;
          if (imgH > maxH) imgH = maxH;

          doc.addImage(img, "PNG", x, cursorY, imgW, imgH, undefined, "FAST");
          cursorY += imgH + 6;
        }
      } catch {}

      const bd = buildBarDataFrom(source, granularity);

      autoTable(doc, {
        startY: cursorY,
        head: [["Periodo", "Atendido", "Pendiente", "Falso", "Total"]],
        body: bd.map((p) => [
          p.label,
          String(p.atendido),
          String(p.pendiente),
          String(p.falso),
          String(p.atendido + p.pendiente + p.falso),
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_reportes_${stamp}.pdf`);
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
                <div className="topbar-actions">
                  {/*EXPORTAR (MODAL PRO) */}
                  <button
                    className="action-pill action-pill-icon"
                    onClick={() => setExportOpen(true)}
                    disabled={!canExport}
                    title="Exportar reporte"
                    type="button"
                    aria-label="Exportar"
                  >
                    <Download size={18} />
                    Exportar
                  </button>

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
              {/*IZQUIERDA: TABLA (en lugar de "Reportes en el tiempo") */}
              <section className="reportes-card reportes-card-embedded card">
                <div className="tabla-head">
                  <div>
                    <div className="chart-title-v2">Tabla de reportes</div>
                    <div className="chart-sub-v2">Según filtros actuales</div>
                  </div>
                </div>

                <div className="tabla-inner tabla-responsive">
                  <table className="reportes-tabla">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Tipo</th>
                        <th>Comunidad</th>
                        <th>Estado</th>
                        <th>Ver</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: "center",
                              padding: 14,
                              fontWeight: 900,
                            }}
                          >
                            Cargando reportes...
                          </td>
                        </tr>
                      ) : reportesFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: "center",
                              padding: 14,
                              fontWeight: 900,
                            }}
                          >
                            No se encontraron reportes.
                          </td>
                        </tr>
                      ) : (
                        reportesFiltrados.map((reporte) => (
                          <tr key={reporte.id}>
                            <td data-label="ID" title={String(reporte.id)}>
                              {reporte.id}
                            </td>
                            <td data-label="Usuario" title={reporte.usuario}>
                              {reporte.usuario}
                            </td>
                            <td data-label="Tipo" title={reporte.tipo}>
                              {reporte.tipo}
                            </td>
                            <td
                              data-label="Comunidad"
                              title={reporte.comunidad}
                            >
                              {reporte.comunidad}
                            </td>
                            <td data-label="Estado">
                              <span className={getBadgeClass(reporte.estado)}>
                                {reporte.estado}
                              </span>
                            </td>

                            <td
                              data-label="Ver"
                              className="acciones acciones-ver"
                            >
                              <button
                                type="button"
                                className="btn-ver"
                                onClick={() => abrirDetalle(reporte)}
                                title="Ver reporte"
                                aria-label="Ver reporte"
                              >
                                <Eye size={18} />
                                <span className="btn-ver-text">Ver</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* DERECHA: tu side-card tal cual */}
              <section className="side-card-v3 card">
                {/* ... TU CÓDIGO ACTUAL DEL DONUT + TOP USUARIOS ... */}
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
                        <ResponsiveContainer width="100%" height={260}>
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
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* ABAJO: "Reportes en el tiempo" ahora full width (donde estaba la tabla) */}
            <section className="chart-card-v3 card chart-card-full">
              <div className="chart-head">
                <div>
                  <div className="chart-title-v2">Reportes en el tiempo</div>
                  <div className="chart-sub-v2">
                    Barras por período (según filtros)
                  </div>
                </div>

                <div className="select-wrap9">
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
              </div>

              <div
                className="line-chart-wrap6 line-chart-full"
                ref={barChartRef}
              >
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

            <p className="panel-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </motion.div>
        </main>
      </div>

      {/* =========================
          MODAL EXPORTAR (IGUAL ANALISIS)
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
                        Resumen + reportes por comunidad + tabla + gráfica
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
                        Exporta únicamente la tabla principal (sin ubicación ni
                        acciones)
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
                        Gráfica + tabla de la serie (día/mes/año)
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
                      Busqueda/ resultados visibles
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
                  {reportes.length}
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

      {/* =========================
    MODAL VER REPORTE
========================== */}
      {/* =========================
    MODAL VER REPORTE (MISMO DISEÑO QUE ANALISIS)
========================== */}
      <AnimatePresence>
        {detalleOpen && (
          <motion.div
            className="anx-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={cerrarDetalle}
          >
            <motion.div
              className="anx-modal-card rep-modal"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Detalle del reporte"
            >
              {/* Header igual al de análisis */}
              <div className="rep-modal-head">
                <div>
                  <div className="rep-modal-title">Detalle del reporte</div>
                  <div className="rep-modal-sub">
                    Información completa del reporte seleccionado
                  </div>
                  <div className="rep-modal-sub">
                    ID: <b>{reporteSeleccionado?.id ?? "—"}</b>
                  </div>
                </div>

                <button
                  type="button"
                  className="rep-modal-close"
                  onClick={cerrarDetalle}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} className="rep-close-icon" />
                </button>
              </div>

              {/* Body con grid de “cards” como análisis */}
              <div className="rep-modal-body">
                {!reporteSeleccionado ? (
                  <div className="rep-empty">Sin datos.</div>
                ) : (
                  <div className="rep-grid-2">
                    {/* Card izquierda: lo mismo que muestras hoy */}
                    <section className="rep-card">
                      <div className="rep-card-title">Datos del reporte</div>

                      <div className="rep-kv-list">
                        <div className="rep-kv-row">
                          <div className="rep-k">ID</div>
                          <div className="rep-v">
                            {reporteSeleccionado.id ?? "—"}
                          </div>
                        </div>

                        <div className="rep-kv-row">
                          <div className="rep-k">Usuario</div>
                          <div className="rep-v">
                            {reporteSeleccionado.usuario ?? "—"}
                          </div>
                        </div>

                        <div className="rep-kv-row">
                          <div className="rep-k">Tipo</div>
                          <div className="rep-v">
                            {reporteSeleccionado.tipo ?? "—"}
                          </div>
                        </div>

                        <div className="rep-kv-row">
                          <div className="rep-k">Comunidad</div>
                          <div className="rep-v">
                            {reporteSeleccionado.comunidad ?? "—"}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Card derecha: lo mismo que tienes hoy */}
                    <section className="rep-card">
                      <div className="rep-card-title">Información</div>

                      <div className="rep-kv-list">
                        <div className="rep-kv-row">
                          <div className="rep-k">Fecha</div>
                          <div className="rep-v">
                            {reporteSeleccionado.fecha ?? "—"}
                          </div>
                        </div>

                        <div className="rep-kv-row">
                          <div className="rep-k">Ubicación</div>
                          <div className="rep-v">
                            {(reporteSeleccionado as any)?.ubicacion ?? "—"}
                          </div>
                        </div>

                        <div className="rep-kv-row">
                          <div className="rep-k">Estado</div>
                          <div className="rep-v">
                            <span
                              className={`rep-pill ${
                                reporteSeleccionado.estado === "Atendido"
                                  ? "rep-pill-ok"
                                  : reporteSeleccionado.estado === "Pendiente"
                                    ? "rep-pill-warn"
                                    : "rep-pill-bad"
                              }`}
                            >
                              {reporteSeleccionado.estado ?? "—"}
                            </span>
                          </div>
                        </div>

                        {/* Si tu reporte tiene descripción u otro campo, lo mostramos */}
                        {(reporteSeleccionado as any)?.descripcion && (
                          <div className="rep-kv-row">
                            <div className="rep-k">Descripción</div>
                            <div className="rep-v">
                              {String((reporteSeleccionado as any).descripcion)}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>

              {/* Footer igual al de análisis: izquierda eliminar, derecha cerrar */}
              <div className="rep-modal-footer">
                <button
                  type="button"
                  className="rep-btn-accent"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
