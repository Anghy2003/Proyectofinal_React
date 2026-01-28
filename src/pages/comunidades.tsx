import "../styles/comunidad.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_SafeZone2.webp";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  comunidadesService,
  type Comunidad,
  type EstadoComunidad,
} from "../services/comunidad.Service";

// Export libs
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Animaciones
import { AnimatePresence, motion } from "framer-motion";

// Gráfico de líneas (mismo estilo dashboard)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Íconos pro
import {
  Search,
  X,
  Download,
  RefreshCcw,
  Building2,
  CheckCircle2,
  Clock3,
  XCircle,
  FileSpreadsheet,
  FileText,
  MapPin,
  Users,
  ShieldAlert,
  Hash,
  Table2,
  LayoutDashboard,
  ToggleLeft,
  ToggleRight,
  LineChart as LineChartIcon,
  Eye,
} from "lucide-react";

type SessionData = {
  userId: number;
  email: string;
  rol: string | null;
  communityId: number | null;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
};

type DailyPoint = {
  key: string; // YYYY-MM-DD
  label: string;
  total: number;
  activas: number;
  solicitadas: number;
  rechazadas: number;
  suspendidas: number;
};

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function getCommunityDate(c: any): Date | null {
  const candidates = [
    c?.createdAt,
    c?.fechaCreacion,
    c?.fechaRegistro,
    c?.created_at,
    c?.updatedAt,
    c?.fechaActualizacion,
    c?.updated_at,
  ].filter(Boolean);

  for (const v of candidates) {
    const d = new Date(v);
    if (isValidDate(d)) return d;
  }
  return null;
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
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${meses[d.getMonth()]}`;
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDailySeries(comunidades: Comunidad[], days = 14): DailyPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base: DailyPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = toKey(d);
    return {
      key,
      label: fmtLabel(d),
      total: 0,
      activas: 0,
      solicitadas: 0,
      rechazadas: 0,
      suspendidas: 0,
    };
  });

  const byKey = new Map(base.map((p) => [p.key, p]));
  let hasRealDates = false;

  comunidades.forEach((c) => {
    const d = getCommunityDate(c as any);
    if (!d) return;
    hasRealDates = true;

    d.setHours(0, 0, 0, 0);
    const key = toKey(d);
    const p = byKey.get(key);
    if (!p) return;

    p.total += 1;
    if (c.estado === "ACTIVA") p.activas += 1;
    if (c.estado === "SOLICITADA") p.solicitadas += 1;
    if (c.estado === "RECHAZADA") p.rechazadas += 1;
    if (c.estado === "SUSPENDIDA") p.suspendidas += 1;
  });

  // fallback visual si no hay fechas reales
  if (!hasRealDates && comunidades.length > 0) {
    comunidades.forEach((c, idx) => {
      const i = idx % days;
      const p = base[i];
      p.total += 1;
      if (c.estado === "ACTIVA") p.activas += 1;
      if (c.estado === "SOLICITADA") p.solicitadas += 1;
      if (c.estado === "RECHAZADA") p.rechazadas += 1;
      if (c.estado === "SUSPENDIDA") p.suspendidas += 1;
    });
  }

  let accTotal = 0,
    accA = 0,
    accS = 0,
    accR = 0,
    accSu = 0;
  return base.map((p) => {
    accTotal += p.total;
    accA += p.activas;
    accS += p.solicitadas;
    accR += p.rechazadas;
    accSu += p.suspendidas;
    return {
      ...p,
      total: accTotal,
      activas: accA,
      solicitadas: accS,
      rechazadas: accR,
      suspendidas: accSu,
    };
  });
}

/* =========================
   Helpers export (logo -> dataURL)
========================= */
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

/* =========================
   SVG (Recharts) -> PNG dataURL (sin libs)
========================= */
async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement,
  outWidthPx = 1200,
): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = svgUrl;
  });

  const w = outWidthPx;
  const h = Math.round((img.height / img.width) * w) || 600;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("No se pudo crear canvas para exportar la gráfica.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(svgUrl);
  return canvas.toDataURL("image/png", 1.0);
}

/* =========================
   Session helpers
========================= */
function getSession(): SessionData | null {
  const raw = localStorage.getItem("session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}
function getAdminUserIdOrThrow(): number {
  const s = getSession();
  const userId = Number(s?.userId ?? 0);
  if (!userId) throw new Error("No se encontró session.userId (admin).");
  return userId;
}

export default function Comunidades() {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar (móvil)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // =========================
  //EXPORT Modal
  // =========================
  type ExportFormat = "PDF" | "XLSX";
  type ExportScope = "TABLE" | "FULL" | "TREND";

  const [openExport, setOpenExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("PDF");
  const [exportScope, setExportScope] = useState<ExportScope>("FULL");
  const [exportUseFilter, setExportUseFilter] = useState(true);
  const [exportWithKpis, setExportWithKpis] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);

  const exportRef = useRef<HTMLDivElement | null>(null);

  // ref del chart para export PDF
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  // MODAL EDITAR
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState<Comunidad | null>(null);

  // MODAL SUSPENDER / REACTIVAR (confirmación)
  const [stateOpen, setStateOpen] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [stateTarget, setStateTarget] = useState<Comunidad | null>(null);

  //MODAL VER DETALLE
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Comunidad | null>(null);

  const openView = async (c: Comunidad) => {
    try {
      // opcional: trae el full para que el modal tenga todo actualizado
      const full = await comunidadesService.obtener(c.id);
      setViewTarget(full);
    } catch {
      setViewTarget(c);
    } finally {
      setViewOpen(true);
    }
  };

  const [editForm, setEditForm] = useState<{
    id: number;
    nombre: string;
    direccion: string;
    codigoAcceso: string;
    miembrosCount: number;
    fotoUrl: string | null;
  }>({
    id: 0,
    nombre: "",
    direccion: "",
    codigoAcceso: "",
    miembrosCount: 0,
    fotoUrl: null,
  });

  const openToggleEstado = (c: Comunidad) => {
    setStateError(null);
    setStateTarget(c);
    setStateOpen(true);
  };

  //Para habilitar solo si es reporte completo
  const kpisEnabled = exportScope === "FULL";

  //Suspender y reactivar (borrado lógico)
  const confirmToggleEstado = async () => {
    try {
      if (!stateTarget) return;

      setStateLoading(true);
      setStateError(null);

      const usuarioId = getAdminUserIdOrThrow();
      const isSuspendida = stateTarget.estado === "SUSPENDIDA";

      if (isSuspendida) {
        await comunidadesService.reactivar(stateTarget.id, usuarioId);

        setComunidades((prev) =>
          prev.map((x) =>
            x.id === stateTarget.id
              ? { ...x, estado: "ACTIVA", activa: true }
              : x,
          ),
        );

        // si el modal detalle está abierto sobre esa misma comunidad
        setViewTarget((prev) =>
          prev && prev.id === stateTarget.id
            ? ({ ...prev, estado: "ACTIVA", activa: true } as any)
            : prev,
        );
      } else {
        await comunidadesService.suspender(stateTarget.id, usuarioId);

        setComunidades((prev) =>
          prev.map((x) =>
            x.id === stateTarget.id
              ? { ...x, estado: "SUSPENDIDA", activa: false }
              : x,
          ),
        );

        setViewTarget((prev) =>
          prev && prev.id === stateTarget.id
            ? ({ ...prev, estado: "SUSPENDIDA", activa: false } as any)
            : prev,
        );
      }

      setStateOpen(false);
      setStateTarget(null);
    } catch (e: any) {
      console.error(e);
      setStateError(
        e?.message || "No se pudo actualizar el estado de la comunidad.",
      );
    } finally {
      setStateLoading(false);
    }
  };

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

  //Cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 901) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  //Cerrar modal export con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenExport(false);
    };
    if (openExport) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openExport]);

  //Cerrar modal editar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditOpen(false);
    };
    if (editOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  //Cerrar modal suspender con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStateOpen(false);
    };
    if (stateOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stateOpen]);

  //Cerrar modal ver con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewOpen(false);
    };
    if (viewOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewOpen]);

  // =========================
  // KPIs + métricas
  // =========================
  const totalComunidades = comunidades.length;

  const activasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "ACTIVA").length,
    [comunidades],
  );

  const solicitadasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "SOLICITADA").length,
    [comunidades],
  );

  const rechazadasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "RECHAZADA").length,
    [comunidades],
  );

  const suspendidasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "SUSPENDIDA").length,
    [comunidades],
  );

  useEffect(() => {
    if (exportScope !== "FULL") {
      setExportWithKpis(false);
    }
  }, [exportScope]);

  // Filtro
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
    if (estado === "SUSPENDIDA") return "badge badge-danger";
    if (estado === "RECHAZADA") return "badge badge-danger";
    return "badge badge-warning"; // SOLICITADA
  };

  const labelEstado = (estado: EstadoComunidad) => {
    if (estado === "ACTIVA") return "Activa";
    if (estado === "SUSPENDIDA") return "Suspendida";
    if (estado === "RECHAZADA") return "Rechazada";
    return "Solicitada";
  };

  // =========================
  //LINE CHART DATA
  // =========================
  const lineData = useMemo(
    () => buildDailySeries(comunidades, 14),
    [comunidades],
  );

  // =========================
  // EXPORT
  // =========================

  const exportExcel = (scope: ExportScope) => {
    const data = getExportData();

    const wb = XLSX.utils.book_new();

    //Hoja Resumen (siempre)
    if (scope === "FULL" && exportWithKpis) {
      const resumen = buildResumenRows(data);
      const wsResumen = XLSX.utils.json_to_sheet(resumen);
      wsResumen["!cols"] = [{ wch: 24 }, { wch: 34 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    }

    //Estado Global (si aplica)
    if (scope === "FULL" && exportWithKpis) {
      const estadoRows = buildEstadoGlobalRows(data);
      const wsEstado = XLSX.utils.json_to_sheet(estadoRows);
      wsEstado["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEstado, "Estado_Global");
    }

    //Tabla (si aplica)
    if (scope === "TABLE" || scope === "FULL") {
      const rows = data.map((c) => ({
        Codigo: c.codigoAcceso ?? "—",
        Nombre: c.nombre ?? "—",
        Miembros: c.miembrosCount ?? 0,
        Direccion: c.direccion ?? "—",
        Estado: labelEstado(c.estado),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 12 },
        { wch: 60 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Comunidades");
    }

    if (scope === "FULL" || scope === "TREND") {
      const chartRows = lineData.map((p) => ({
        Fecha: p.key,
        Etiqueta: p.label,
        Total: p.total,
        Activas: p.activas,
        Solicitadas: p.solicitadas,
        Rechazadas: p.rechazadas,
        Suspendidas: p.suspendidas,
      }));
      const ws2 = XLSX.utils.json_to_sheet(chartRows);
      ws2["!cols"] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "Tendencia_14d");
    }

    const stamp = nowStamp();
    const name = `comunidades_${scopeLabel(scope)}_${stamp}.xlsx`;
    XLSX.writeFile(wb, name);
  };

  const exportPDF = async (scope: ExportScope) => {
    const data = getExportData();

    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

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
    doc.text(scopeTitle(scope), pageW / 2, titleY, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generado: ${new Date().toLocaleString("es-EC")}`,
      pageW / 2,
      titleY + 8,
      {
        align: "center",
      },
    );

    //Meta (filtro / registros)
    let cursorY = titleY + 18;

    if (scope === "FULL" && exportWithKpis) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 4;
      autoTable(doc, {
        startY: cursorY,
        head: [["Resumen", "Valor"]],
        body: buildResumenRows(data).map((x) => [x.Indicador, String(x.Valor)]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: pageW - 28 - 60 },
        },
        margin: { left: 14, right: 14 },
      });

      cursorY =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ??
          cursorY) + 8;
    }

    //TABLA (si aplica)
    if (scope === "TABLE" || scope === "FULL") {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tabla de comunidades", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 4;
      autoTable(doc, {
        startY: cursorY,

        head: [["Código", "Nombre", "Miembros", "Dirección", "Estado"]],
        body: data.map((c) => [
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

      cursorY =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ??
          cursorY) + 10;
    }

    //RESUMEN ESTADO (equivalente al donut) (si aplica)
    if (scope === "FULL") {
      // Salto de página si no entra
      if (cursorY + 40 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Estado global (resumen)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY + 4,
        head: [["Estado", "Cantidad", "Porcentaje"]],
        body: buildEstadoTableBody(data),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      });

      cursorY =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ??
          cursorY) + 10;
    }

    //TENDENCIA (si aplica)
    if (scope === "FULL" || scope === "TREND") {
      // Si no entra, nueva página
      if (cursorY + 90 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Tendencia de comunidades (últimos 14 días)",
        pageW / 2,
        cursorY,
        {
          align: "center",
        },
      );
      doc.setFont("helvetica", "normal");
      cursorY += 6;

      try {
        const wrap = chartWrapRef.current;
        const svg = wrap?.querySelector("svg") as SVGSVGElement | null;

        if (svg) {
          const pngDataUrl = await svgElementToPngDataUrl(svg, 1400);
          const maxW = pageW - 28;
          const imgW = maxW;
          const imgH = 72;
          const x = (pageW - imgW) / 2;
          doc.addImage(pngDataUrl, "PNG", x, cursorY, imgW, imgH);
          cursorY += imgH + 6;
        } else {
          doc.setFontSize(10);
          doc.text(
            "No se pudo capturar la gráfica (SVG no encontrado).",
            pageW / 2,
            cursorY + 10,
            {
              align: "center",
            },
          );
          cursorY += 20;
        }
      } catch (e) {
        console.error(e);
        doc.setFontSize(10);
        doc.text("No se pudo exportar la gráfica.", pageW / 2, cursorY + 10, {
          align: "center",
        });
        cursorY += 20;
      }

      const last = lineData;
      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            "Día",
            "Total",
            "Activas",
            "Solicitadas",
            "Rechazadas",
            "Suspendidas",
          ],
        ],
        body: last.map((p) => [
          p.label,
          String(p.total),
          String(p.activas),
          String(p.solicitadas),
          String(p.rechazadas),
          String(p.suspendidas),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
      });
    }

    const stamp = nowStamp();
    const name = `comunidades_${scopeLabel(scope)}_${stamp}.pdf`;
    doc.save(name);
  };

  const canExport = comunidadesFiltradas.length > 0;

  // =========================
  //Export helpers
  // =========================
  const nowStamp = () => new Date().toISOString().slice(0, 10);

  const getExportData = () => {
    const base = exportUseFilter ? comunidadesFiltradas : comunidades;
    return base;
  };

  const scopeLabel = (s: ExportScope) => {
    if (s === "TABLE") return "solo_tabla";
    if (s === "FULL") return "reporte_completo";
    return "solo_tendencia";
  };

  const scopeTitle = (s: ExportScope) => {
    if (s === "TABLE") return "Reporte de Comunidades (Solo tabla)";
    if (s === "FULL") return "Reporte de Comunidades (Completo)";
    return "Reporte de Comunidades (Solo tendencia)";
  };

  const buildResumenRows = (data: Comunidad[]) => {
    const total = data.length;
    const a = data.filter((c) => c.estado === "ACTIVA").length;
    const s = data.filter((c) => c.estado === "SOLICITADA").length;
    const r = data.filter((c) => c.estado === "RECHAZADA").length;
    const su = data.filter((c) => c.estado === "SUSPENDIDA").length;

    return [
      { Indicador: "Total", Valor: total },
      { Indicador: "Activas", Valor: a },
      { Indicador: "Solicitadas", Valor: s },
      { Indicador: "Rechazadas", Valor: r },
      { Indicador: "Suspendidas", Valor: su },
      {
        Indicador: "Filtro aplicado",
        Valor: exportUseFilter ? search || "—" : "No",
      },
      {
        Indicador: "Registros exportados",
        Valor: `${data.length} de ${comunidades.length}`,
      },
    ];
  };

  const buildEstadoTableBody = (data: Comunidad[]) => {
    const total = data.length || 1;
    const a = data.filter((c) => c.estado === "ACTIVA").length;
    const s = data.filter((c) => c.estado === "SOLICITADA").length;
    const r = data.filter((c) => c.estado === "RECHAZADA").length;
    const su = data.filter((c) => c.estado === "SUSPENDIDA").length;

    const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

    return [
      ["Activas", String(a), pct(a)],
      ["Solicitadas", String(s), pct(s)],
      ["Rechazadas", String(r), pct(r)],
      ["Suspendidas", String(su), pct(su)],
    ];
  };

  const buildEstadoGlobalRows = (data: Comunidad[]) => {
    const total = data.length || 1;

    const a = data.filter((c) => c.estado === "ACTIVA").length;
    const s = data.filter((c) => c.estado === "SOLICITADA").length;
    const r = data.filter((c) => c.estado === "RECHAZADA").length;
    const su = data.filter((c) => c.estado === "SUSPENDIDA").length;

    const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

    return [
      { Estado: "Activas", Cantidad: a, Porcentaje: pct(a) },
      { Estado: "Solicitadas", Cantidad: s, Porcentaje: pct(s) },
      { Estado: "Rechazadas", Cantidad: r, Porcentaje: pct(r) },
      { Estado: "Suspendidas", Cantidad: su, Porcentaje: pct(su) },
    ];
  };

  // =========================
  // Donut (CSS conic-gradient)
  // =========================
  const pct = (n: number) =>
    totalComunidades > 0 ? (n / totalComunidades) * 100 : 0;
  const pAct = pct(activasCount);
  const pSol = pct(solicitadasCount);

  const donutBg =
    totalComunidades > 0
      ? `conic-gradient(
          #16a34a 0% ${pAct}%,
          #f59e0b ${pAct}% ${pAct + pSol}%,
          #ef4444 ${pAct + pSol}% 100%
        )`
      : `conic-gradient(rgba(15,23,42,0.12) 0 100%)`;

  // =========================
  //EDIT (modal)
  // =========================
  const openEdit = async (c: Comunidad) => {
    try {
      setEditError(null);
      const full = await comunidadesService.obtener(c.id);

      setEditOriginal(full);

      setEditForm({
        id: full.id,
        nombre: full.nombre ?? "",
        direccion: (full.direccion ?? "") as string,
        codigoAcceso: full.codigoAcceso ?? "",
        miembrosCount: full.miembrosCount ?? 0,
        fotoUrl: full.fotoUrl ?? null,
      });

      setEditOpen(true);
    } catch (e) {
      console.error(e);
      setEditError("No se pudo cargar la comunidad para editar.");
      setEditOpen(true);
    }
  };

  const trim = (s: string) => (s ?? "").trim();

  const editDirty = useMemo(() => {
    if (!editOriginal) return false;
    const n0 = trim(editOriginal.nombre ?? "");
    const d0 = trim((editOriginal.direccion ?? "") as string);
    const n1 = trim(editForm.nombre);
    const d1 = trim(editForm.direccion);
    return n0 !== n1 || d0 !== d1;
  }, [editOriginal, editForm.nombre, editForm.direccion]);

  const saveEdit = async () => {
    try {
      if (!editOriginal) return;

      setEditLoading(true);
      setEditError(null);

      const usuarioId = getAdminUserIdOrThrow();

      // PAYLOAD SEGURO (conservar campos para evitar null)
      const payload = {
        id: editOriginal.id,
        nombre: trim(editForm.nombre),
        direccion: trim(editForm.direccion) || null,

        codigoAcceso: editOriginal.codigoAcceso ?? null,
        fotoUrl: editOriginal.fotoUrl ?? null,
        radioKm: (editOriginal as any).radioKm ?? 1.0,
        activa: (editOriginal as any).activa ?? true,
        estado: (editOriginal as any).estado ?? "ACTIVA",
        solicitadaPorUsuarioId:
          (editOriginal as any).solicitadaPorUsuarioId ?? null,
        fechaCreacion: (editOriginal as any).fechaCreacion ?? null,
      };

      const updated = await comunidadesService.actualizar(
        editForm.id,
        usuarioId,
        payload as any,
      );

      setComunidades((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      );

      setViewTarget((prev) =>
        prev && prev.id === updated.id ? updated : prev,
      );

      setEditOpen(false);
      setEditOriginal(null);
    } catch (e: any) {
      console.error(e);
      setEditError(e?.message || "Error al actualizar la comunidad.");
    } finally {
      setEditLoading(false);
    }
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
        <main className="comunidades-main">
          <motion.div
            className="comunidades-panel card"
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
                  <div className="page-title">Comunidades</div>

                  <div className={`search-pill-v2 ${search ? "open" : ""}`}>
                    <span className="search-ico-v2" aria-hidden="true">
                      <Search size={18} />
                    </span>

                    <input
                      type="text"
                      className="search-input-v2"
                      placeholder="Buscar por nombre, código o dirección..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />

                    {!!search && (
                      <button
                        className="search-clear-v2"
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => setSearch("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/*BOTONES */}
                <div ref={exportRef} className="topbar-actions">
                  <button
                    className="action-pill"
                    onClick={() => setOpenExport(true)}
                    disabled={!canExport}
                    title="Exportar reporte"
                    type="button"
                  >
                    <Download size={18} />
                    Exportar
                  </button>

                  <button
                    className="action-pill action-pill-accent"
                    onClick={cargarComunidades}
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

            {error && (
              <p style={{ color: "#f95150", fontWeight: 900, marginTop: 6 }}>
                {error}
              </p>
            )}

            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Total comunidades</span>
                  <div className="kpi-icon kpi-total" aria-hidden="true">
                    <Building2 size={24} />
                  </div>
                </div>
                <div className="kpi-value">{totalComunidades}</div>
                <div className="kpi-sub">Registradas en el sistema</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Activas</span>
                  <div className="kpi-icon kpi-ok" aria-hidden="true">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
                <div className="kpi-value">{activasCount}</div>
                <div className="kpi-sub">Operativas y visibles</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Solicitadas</span>
                  <div className="kpi-icon kpi-warn" aria-hidden="true">
                    <Clock3 size={24} />
                  </div>
                </div>
                <div className="kpi-value">{solicitadasCount}</div>
                <div className="kpi-sub">Pendientes de revisión</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Rechazadas</span>
                  <div className="kpi-icon kpi-bad" aria-hidden="true">
                    <XCircle size={24} />
                  </div>
                </div>
                <div className="kpi-value">{rechazadasCount}</div>
                <div className="kpi-sub">No habilitadas</div>
              </div>
            </div>

            <div className="grid-2col">
              {/*TABLA*/}
              <section className="chart-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Listado de comunidades</div>
                    <div className="chart-sub-v2">
                      Resultados: <b>{comunidadesFiltradas.length}</b>
                    </div>
                  </div>
                </div>

                <section className="tabla-panel tabla-panel-in-chart">
                  <div className="tabla-inner">
                    <table className="tabla-comunidades">
                      <thead>
                        <tr>
                          <th>Foto</th>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Dirección</th>
                          <th style={{ textAlign: "center" }}>Ver</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ textAlign: "center", fontWeight: 900 }}
                            >
                              Cargando comunidades...
                            </td>
                          </tr>
                        ) : comunidadesFiltradas.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ textAlign: "center", fontWeight: 900 }}
                            >
                              No se encontraron comunidades.
                            </td>
                          </tr>
                        ) : (
                          comunidadesFiltradas.map((c) => (
                            <tr
                              key={c.id}
                              className={
                                c.estado === "SUSPENDIDA" ? "row-suspended" : ""
                              }
                            >
                              <td>
                                {c.fotoUrl ? (
                                  <img
                                    src={c.fotoUrl}
                                    alt="foto comunidad"
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 12,
                                      objectFit: "cover",
                                      border: "1px solid rgba(15,23,42,0.10)",
                                      background: "rgba(255,255,255,0.7)",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 12,
                                      background: "rgba(15,23,42,0.06)",
                                      border: "1px solid rgba(15,23,42,0.10)",
                                    }}
                                  />
                                )}
                              </td>

                              <td>{c.codigoAcceso ?? "—"}</td>

                              <td
                                title={c.nombre ?? ""}
                                className="cell-ellipsis"
                              >
                                {c.nombre ?? "—"}
                              </td>

                              <td
                                title={c.direccion ?? ""}
                                className="cell-ellipsis"
                              >
                                {c.direccion ?? "—"}
                              </td>

                              <td style={{ textAlign: "center" }}>
                                <button
                                  className="btn-ver"
                                  type="button"
                                  onClick={() => openView(c)}
                                  title="Ver detalles"
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
              </section>

              {/*DONUT */}
              <section className="donut-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Estado global</div>
                    <div className="chart-sub-v2">Donut por proporción</div>
                  </div>
                </div>

                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{ background: donutBg }}
                    aria-label="Donut de estados"
                  >
                    <div className="donut-hole">
                      <div className="donut-total1">{totalComunidades}</div>
                      <div className="donut-label1">Comunidades</div>
                    </div>
                  </div>

                  <div className="donut-legend">
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#16a34a" }}
                      />
                      <span className="donut-name">Activas</span>
                      <span className="donut-val">{activasCount}</span>
                    </div>

                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#f59e0b" }}
                      />
                      <span className="donut-name">Solicitadas</span>
                      <span className="donut-val">{solicitadasCount}</span>
                    </div>

                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#ef4444" }}
                      />
                      <span className="donut-name">Rechazadas</span>
                      <span className="donut-val">{rechazadasCount}</span>
                    </div>

                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#64748b" }}
                      />
                      <span className="donut-name">Suspendidas</span>
                      <span className="donut-val">{suspendidasCount}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/*GRÁFICA*/}
            <section className="chart-card-v2 card chart-card-full">
              <div className="chart-head">
                <div>
                  <div className="chart-title-v2">Tendencia de comunidades</div>
                  <div className="chart-sub-v2">
                    Últimos 14 días (acumulado)
                  </div>
                </div>
              </div>

              <div className="line-chart-wrap1" ref={chartWrapRef}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={lineData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tickMargin={8} />
                    <YAxis tickMargin={8} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: any, name: any) => [v, name]}
                      labelFormatter={(l) => `Día: ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="#f95150"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="activas"
                      name="Activas"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="solicitadas"
                      name="Solicitadas"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="rechazadas"
                      name="Rechazadas"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="suspendidas"
                      name="Suspendidas"
                      stroke="#64748b"
                      strokeWidth={2}
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

      {/*MODAL EDITAR*/}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditOpen(false)}
          >
            <motion.div
              className="sz-modal-card"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sz-modal-head">
                <div>
                  <div className="sz-modal-title">Editar comunidad</div>
                  <div className="sz-modal-sub">
                    Solo se permite editar <b>Nombre</b> y <b>Dirección</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => setEditOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {editError && <div className="sz-modal-error">{editError}</div>}

              <div className="sz-modal-grid">
                <div className="sz-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Foto (bloqueado)</span>

                  <div className="sz-photo-row">
                    {editForm.fotoUrl ? (
                      <img
                        src={editForm.fotoUrl}
                        alt="foto comunidad"
                        className="sz-photo"
                      />
                    ) : (
                      <div className="sz-photo sz-photo-empty" />
                    )}

                    <input
                      value={editForm.fotoUrl ?? "—"}
                      disabled
                      className="sz-input"
                    />
                  </div>
                </div>

                <label className="sz-field">
                  <span>Código (bloqueado)</span>
                  <input
                    value={editForm.codigoAcceso || "—"}
                    disabled
                    className="sz-input"
                  />
                </label>

                <label className="sz-field">
                  <span>Miembros (bloqueado)</span>
                  <input
                    value={String(editForm.miembrosCount ?? 0)}
                    disabled
                    className="sz-input"
                  />
                </label>

                <label className="sz-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Nombre</span>
                  <input
                    value={editForm.nombre}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, nombre: e.target.value }))
                    }
                    placeholder="Nombre de la comunidad"
                    className="sz-input"
                  />
                </label>

                <label className="sz-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Dirección</span>
                  <input
                    value={editForm.direccion}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, direccion: e.target.value }))
                    }
                    placeholder="Dirección"
                    className="sz-input"
                  />
                </label>
              </div>

              <div className="sz-modal-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
                >
                  Cancelar
                </button>

                <button
                  className="sz-btn-primary"
                  type="button"
                  onClick={saveEdit}
                  disabled={editLoading || !editDirty}
                  title={!editDirty ? "No hay cambios para guardar" : "Guardar"}
                >
                  {editLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*MODAL SUSPENDER / REACTIVAR */}
      <AnimatePresence>
        {stateOpen && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStateOpen(false)}
          >
            <motion.div
              className={`sz-modal-card ${
                stateTarget?.estado === "SUSPENDIDA" ? "" : "sz-modal-danger"
              }`}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sz-modal-head">
                <div>
                  <div className="sz-modal-title">
                    {stateTarget?.estado === "SUSPENDIDA"
                      ? "¿Reactivar comunidad?"
                      : "¿Suspender comunidad?"}
                  </div>
                  <div className="sz-modal-sub">
                    Comunidad: <b>{stateTarget?.nombre ?? "—"}</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => setStateOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sz-danger-box">
                <div className="sz-danger-name">
                  {stateTarget?.nombre ?? "—"}
                </div>

                <div className="sz-danger-meta">
                  Miembros: <b>{stateTarget?.miembrosCount ?? 0}</b>
                </div>

                <div className="sz-danger-meta">
                  Dirección: {stateTarget?.direccion ?? "—"}
                </div>

                <div className="sz-danger-meta">
                  Código: <b>{stateTarget?.codigoAcceso ?? "—"}</b>
                </div>

                {stateTarget?.estado === "SUSPENDIDA" ? (
                  <div className="sz-danger-warning">
                    ✅ La comunidad volverá a estar <b>ACTIVA</b> y operativa.
                  </div>
                ) : (
                  <div className="sz-danger-warning">
                    ⚠️ La comunidad quedará <b>SUSPENDIDA</b> (no se elimina
                    información).
                  </div>
                )}
              </div>

              {stateError && <div className="sz-modal-error">{stateError}</div>}

              <div className="sz-modal-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setStateOpen(false)}
                  disabled={stateLoading}
                >
                  Cancelar
                </button>

                <button
                  className={
                    stateTarget?.estado === "SUSPENDIDA"
                      ? "sz-btn-primary"
                      : "sz-btn-danger"
                  }
                  type="button"
                  onClick={confirmToggleEstado}
                  disabled={stateLoading}
                >
                  {stateLoading
                    ? "Procesando..."
                    : stateTarget?.estado === "SUSPENDIDA"
                      ? "Sí, reactivar"
                      : "Sí, suspender"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*MODAL VER DETALLE COMUNIDAD (PRO + Suspender/Reactivar aquí) */}
      <AnimatePresence>
        {viewOpen && viewTarget && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewOpen(false)}
          >
            <motion.div
              className="sz-modal-card sz-view-card"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sz-modal-head">
                <div>
                  <div className="sz-modal-title">Detalle de comunidad</div>
                  <div className="sz-modal-sub">
                    Código: <b>{viewTarget.codigoAcceso ?? "—"}</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => setViewOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sz-view-top">
                <div className="sz-view-photoWrap">
                  {viewTarget.fotoUrl ? (
                    <img
                      src={viewTarget.fotoUrl}
                      alt="Foto comunidad"
                      className="sz-view-photo"
                    />
                  ) : (
                    <div className="sz-view-photo sz-view-photoEmpty" />
                  )}
                </div>

                <div className="sz-view-name">{viewTarget.nombre ?? "—"}</div>

                <div className="sz-view-pillRow">
                  {/*<span className="sz-view-pill">
                    <Hash size={16} />
                    ID: {String(viewTarget.id)}
                  </span>*/}

                  <span className="sz-view-pill">
                    <Users size={16} />
                    Miembros: <b>{viewTarget.miembrosCount ?? 0}</b>
                  </span>

                  <span className="sz-view-pill">
                    <ShieldAlert size={16} />
                    <span className={badgeClass(viewTarget.estado)}>
                      {labelEstado(viewTarget.estado)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="sz-view-grid">
                <div className="sz-view-item">
                  <span>
                    <MapPin size={16} /> Dirección
                  </span>
                  <div>{viewTarget.direccion ?? "—"}</div>
                </div>

                <div className="sz-view-item">
                  <span>
                    <Hash size={16} /> Código
                  </span>
                  <div>
                    <b>{viewTarget.codigoAcceso ?? "—"}</b>
                  </div>
                </div>
              </div>

              <div className="sz-modal-actions sz-view-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setViewOpen(false)}
                >
                  Cerrar
                </button>

                <div className="sz-view-actions-right">
                  <button
                    className="sz-btn-primary"
                    type="button"
                    onClick={() => {
                      setViewOpen(false);
                      openEdit(viewTarget);
                    }}
                    disabled={viewTarget.estado === "SUSPENDIDA"}
                    title={
                      viewTarget.estado === "SUSPENDIDA"
                        ? "No se puede editar una comunidad suspendida"
                        : "Editar"
                    }
                  >
                    Editar
                  </button>

                  <button
                    className={
                      viewTarget.estado === "SUSPENDIDA"
                        ? "sz-btn-primary"
                        : "sz-btn-danger"
                    }
                    type="button"
                    onClick={() => {
                      setViewOpen(false);
                      openToggleEstado(viewTarget);
                    }}
                    title={
                      viewTarget.estado === "SUSPENDIDA"
                        ? "Reactivar"
                        : "Suspender"
                    }
                  >
                    {viewTarget.estado === "SUSPENDIDA"
                      ? "Reactivar"
                      : "Suspender"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*MODAL EXPORTACIÓN */}
      <AnimatePresence>
        {openExport && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !exportBusy && setOpenExport(false)}
          >
            <motion.div
              className="sz-modal-card sz-export-card"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sz-modal-head">
                <div>
                  <div className="sz-modal-title1">Exportar</div>
                  <div className="sz-modal-sub">
                    Selecciona el contenido que deseas exportar. El reporte
                    conservará el logotipo, el encabezado y el formato actual.
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => !exportBusy && setOpenExport(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sz-export-grid">
                {/* FORMATO */}
                <div className="sz-export-col">
                  <div className="sz-export-title">
                    <span className="sz-dot" />
                    Formato
                  </div>

                  <button
                    type="button"
                    className={`sz-export-item ${exportFormat === "PDF" ? "active" : ""}`}
                    onClick={() => setExportFormat("PDF")}
                  >
                    <span
                      className={`sz-switch ${exportFormat === "PDF" ? "on" : ""}`}
                    >
                      {exportFormat === "PDF" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <FileText size={18} />
                    </span>

                    <div className="anx-opt-text">
                      PDF <br />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(15,23,42,0.62)",
                        }}
                      >
                        Ideal para impresión
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${exportFormat === "XLSX" ? "active" : ""}`}
                    onClick={() => setExportFormat("XLSX")}
                  >
                    <span
                      className={`sz-switch ${exportFormat === "XLSX" ? "on" : ""}`}
                    >
                      {exportFormat === "XLSX" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <FileSpreadsheet size={18} />
                    </span>

                    <div className="anx-opt-text">
                      Excel <br />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(15,23,42,0.62)",
                        }}
                      >
                        Análisis y filtros
                      </span>
                    </div>
                  </button>
                </div>

                {/* CONTENIDO (solo 3 opciones) */}
                <div className="sz-export-col">
                  <div className="sz-export-title">
                    <span className="sz-dot" />
                    Contenido
                  </div>

                  <button
                    type="button"
                    className={`sz-export-item ${exportScope === "TABLE" ? "active" : ""}`}
                    onClick={() => setExportScope("TABLE")}
                  >
                    <span
                      className={`sz-switch ${exportScope === "TABLE" ? "on" : ""}`}
                    >
                      {exportScope === "TABLE" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <Table2 size={18} />
                    </span>

                    <div className="anx-opt-text">
                      Solo Tabla <br />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(15,23,42,0.62)",
                        }}
                      >
                        Exportar unicamente la tabla principal
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${exportScope === "FULL" ? "active" : ""}`}
                    onClick={() => setExportScope("FULL")}
                  >
                    <span
                      className={`sz-switch ${exportScope === "FULL" ? "on" : ""}`}
                    >
                      {exportScope === "FULL" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <LayoutDashboard size={18} />
                    </span>

                    <div className="anx-opt-text">
                      Reporte completo <br />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(15,23,42,0.62)",
                        }}
                      >
                        Resumen + tabla + estado global + gráfica
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${exportScope === "TREND" ? "active" : ""}`}
                    onClick={() => setExportScope("TREND")}
                  >
                    <span
                      className={`sz-switch ${exportScope === "TREND" ? "on" : ""}`}
                    >
                      {exportScope === "TREND" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <LineChartIcon size={18} />
                    </span>

                    <div className="anx-opt-text">
                      Solo Gráfica <br />
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(15,23,42,0.62)",
                        }}
                      >
                        Gráfica tendencia de comunidades
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* OPCIONES (solo 1) */}
              <div className="sz-export-options">
                <div className="sz-export-title" style={{ marginBottom: 10 }}>
                  <span className="sz-dot" />
                  Opciones
                </div>

                <button
                  type="button"
                  className={`sz-opt ${exportUseFilter ? "on" : ""}`}
                  onClick={() => setExportUseFilter((v) => !v)}
                >
                  <span className={`sz-switch ${exportUseFilter ? "on" : ""}`}>
                    {exportUseFilter ? (
                      <ToggleRight size={18} />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </span>
                  <div className="anx-opt-text">
                    Usar filtros actuales <br />
                    <span
                      style={{ fontWeight: 700, color: "rgba(15,23,42,0.62)" }}
                    >
                      Busqueda/ resultados visibles
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`sz-opt ${exportWithKpis && kpisEnabled ? "on" : ""}`}
                  onClick={() => {
                    if (!kpisEnabled) return;
                    setExportWithKpis((v) => !v);
                  }}
                  disabled={!kpisEnabled}
                  style={
                    !kpisEnabled
                      ? { opacity: 0.5, cursor: "not-allowed" }
                      : undefined
                  }
                  title={
                    !kpisEnabled
                      ? "Disponible solo en el reporte completo"
                      : "Incluir KPIs / Resumen"
                  }
                >
                  <span
                    className={`sz-switch ${
                      exportWithKpis && kpisEnabled ? "on" : ""
                    }`}
                  >
                    {exportWithKpis && kpisEnabled ? (
                      <ToggleRight size={18} />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </span>
                  <div className="anx-opt-text">
                    Incluir KPIs / Resumen <br />
                    <span
                      style={{ fontWeight: 700, color: "rgba(15,23,42,0.62)" }}
                    >
                      Solo disponible en “Reporte completo”
                    </span>
                  </div>
                </button>

                <div className="sz-export-count">
                  Registros a exportar:{" "}
                  <b>
                    {exportUseFilter
                      ? comunidadesFiltradas.length
                      : comunidades.length}
                  </b>{" "}
                  de{" "}
                  <b>
                    {exportUseFilter
                      ? comunidadesFiltradas.length
                      : comunidades.length}
                  </b>
                </div>
              </div>

              {/* FOOTER */}
              <div className="sz-export-footer">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => !exportBusy && setOpenExport(false)}
                  disabled={exportBusy}
                >
                  Cancelar
                </button>

                <button
                  className="sz-btn-accent"
                  type="button"
                  disabled={exportBusy || !canExport}
                  onClick={async () => {
                    try {
                      setExportBusy(true);
                      if (exportFormat === "PDF") {
                        await exportPDF(exportScope);
                      } else {
                        exportExcel(exportScope);
                      }
                      setOpenExport(false);
                    } finally {
                      setExportBusy(false);
                    }
                  }}
                  title="Exportar"
                >
                  {exportBusy ? "Exportando..." : "Exportar ahora"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
