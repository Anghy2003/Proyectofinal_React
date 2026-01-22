// ===============================
// src/pages/Usuarios.tsx
// ===============================
import "../styles/usuario.css";
import Sidebar from "../components/sidebar";
import html2canvas from "html2canvas";

import logoSafeZone from "../assets/logo_SafeZone.png";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { usuariosService, type UsuarioApi } from "../services/Usuario.Service";

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
  Users,
  UserCheck,
  UserX,
  Activity,
  FileSpreadsheet,
  FileText,

  // ✅ NUEVOS para modal pro de exportación (igual Comunidades)
  Table2,
  LayoutDashboard,
  LineChart as LineChartIcon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ✅ Charts (mismo stack que Dashboard/Comunidades) — BARRAS
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";

type EstadoUsuarioCuenta = "Activo" | "Suspendido";
type EstadoUsuarioOnline = "Activo" | "Inactivo";

type UsuarioUI = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  comunidad: string;
  rol: string;

  // Cuenta
  estadoCuenta: EstadoUsuarioCuenta;

  // Presencia aprox
  estadoOnline: EstadoUsuarioOnline;

  fechaRegistro: string; // dd/mm/yyyy (UI)
  horaRegistro: string; // hh:mm (UI)
  ultimoAcceso: string; // dd/mm/yyyy hh:mm (UI)
  fotoUrl?: string;

  // ISO para cálculos
  fechaRegistroIso?: string | null;
  ultimoAccesoIso?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function isoToFechaHora(iso?: string | null) {
  if (!iso) return { fecha: "", hora: "" };
  const d = new Date(iso);
  if (!isValidDate(d)) return { fecha: "", hora: "" };
  return {
    fecha: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

/** Presencia aproximada */
const ONLINE_THRESHOLD_MIN = 3;

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

/* =========================
   Bar Chart — registros 14d
========================= */
type DailyPoint = { key: string; label: string; registros: number };

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

function buildDailyRegistros(users: UsuarioUI[], days = 14): DailyPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base: DailyPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { key: toKey(d), label: fmtLabel(d), registros: 0 };
  });

  const byKey = new Map(base.map((p) => [p.key, p]));
  let hasRealDates = false;

  for (const u of users) {
    if (!u.fechaRegistroIso) continue;
    const d = new Date(u.fechaRegistroIso);
    if (!isValidDate(d)) continue;
    hasRealDates = true;

    d.setHours(0, 0, 0, 0);
    const key = toKey(d);
    const p = byKey.get(key);
    if (!p) continue;
    p.registros += 1;
  }

  // fallback suave si backend no manda fechaRegistro
  if (!hasRealDates && users.length > 0) {
    users.forEach((_, idx) => {
      const i = idx % days;
      base[i].registros += 1;
    });
  }

  return base;
}

/* =========================
   Tooltip PRO (glass) — registros
========================= */
function RegistrosTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" />
        <span className="chart-tooltip-value">{v}</span>
        <span className="chart-tooltip-unit">registros</span>
      </div>
    </div>
  );
}

/* =========================
   Tooltip PRO — Top comunidades
========================= */
function ComunidadesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot chart-tooltip-dot-teal" />
        <span className="chart-tooltip-value">{v}</span>
        <span className="chart-tooltip-unit">usuarios</span>
      </div>
    </div>
  );
}

/* =========================================================
   ✅ Helper: convertir SVG (Recharts) a PNG DataURL para jsPDF
========================================================= */
async function svgToPngDataUrl(
  svgEl: SVGSVGElement,
  scale = 2,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const xml = new XMLSerializer().serializeToString(svgEl);

  const svg = xml.includes("xmlns=")
    ? xml
    : xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar SVG como imagen"));
    img.src = url;
  });

  const box = svgEl.getBoundingClientRect();
  const w = Math.max(1, Math.floor(box.width));
  const h = Math.max(1, Math.floor(box.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  return { dataUrl: canvas.toDataURL("image/png", 1.0), width: w, height: h };
}

export default function Usuarios() {
  // ✅ sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref del chart (para export PDF)
  const chartRegistrosRef = useRef<HTMLDivElement | null>(null);

  //MODAL VER DETALLE (con suspender dentro)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<UsuarioUI | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const openView = (u: UsuarioUI) => {
    setViewError(null);
    setViewTarget(u);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewTarget(null);
    setViewError(null);
    setViewLoading(false);
  };

  //CONFIRM MODAL (seguro)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const confirmSuspendUser = async () => {
    try {
      if (!viewTarget) return;
      if (viewTarget.estadoCuenta === "Suspendido") return;

      setConfirmLoading(true);
      setConfirmError(null);

      await usuariosService.desactivar(viewTarget.id);

      // Update UI tabla
      setUsuarios((prev) =>
        prev.map((x) =>
          x.id === viewTarget.id ? { ...x, estadoCuenta: "Suspendido" } : x,
        ),
      );

      // Update modal target
      setViewTarget((prev) =>
        prev ? { ...prev, estadoCuenta: "Suspendido" } : prev,
      );

      setConfirmOpen(false);
    } catch (e: any) {
      console.error(e);
      setConfirmError(
        e?.message || "No se pudo suspender al usuario. Inténtalo nuevamente.",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const cargarUsuarios = async () => {
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

          // Estado CUENTA
          estadoCuenta: u.activo ? "Activo" : "Suspendido",

          // Estado ONLINE
          estadoOnline: getEstadoOnline(ultimoAccesoIso),

          fechaRegistro: reg.fecha,
          horaRegistro: reg.hora,
          ultimoAcceso: acc.fecha ? `${acc.fecha} ${acc.hora}` : "—",
          fotoUrl: u.fotoUrl,

          // ISO para charts y refresh online
          fechaRegistroIso: u.fechaRegistro ?? null,
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

  useEffect(() => {
    cargarUsuarios();
  }, []);

  //recomputa estadoOnline cada 30s sin volver a pegar al backend
  useEffect(() => {
    const t = setInterval(() => {
      setUsuarios((prev) =>
        prev.map((u) => ({
          ...u,
          estadoOnline: getEstadoOnline(u.ultimoAccesoIso ?? null),
        })),
      );

      // si el modal está abierto, reflejar online también
      setViewTarget((prev) =>
        prev
          ? {
              ...prev,
              estadoOnline: getEstadoOnline(prev.ultimoAccesoIso ?? null),
            }
          : prev,
      );
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Cerrar sidebar al agrandar pantalla
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 901) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cerrar modal VER con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeView();
    };
    if (viewOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewOpen]);

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) =>
    setBusqueda(e.target.value);

  const usuariosFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return usuarios;
    return usuarios.filter((u) => {
      return (
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.comunidad.toLowerCase().includes(term)
      );
    });
  }, [usuarios, busqueda]);

  // =========================
  // KPIs
  // =========================
  const totalUsuarios = usuarios.length;

  const cuentaActivos = useMemo(
    () => usuarios.filter((u) => u.estadoCuenta === "Activo").length,
    [usuarios],
  );

  const cuentaSuspendidos = useMemo(
    () => usuarios.filter((u) => u.estadoCuenta === "Suspendido").length,
    [usuarios],
  );

  const onlineActivos = useMemo(
    () => usuarios.filter((u) => u.estadoOnline === "Activo").length,
    [usuarios],
  );

  // =========================
  // Top comunidades
  // =========================
  const topComunidades = useMemo(() => {
    const by = new Map<string, { total: number; fotoUrl?: string }>();

    for (const u of usuarios) {
      const k = (u.comunidad ?? "—").trim() || "—";
      const current = by.get(k);

      if (!current) {
        by.set(k, { total: 1, fotoUrl: u.fotoUrl });
      } else {
        current.total += 1;
        if (!current.fotoUrl && u.fotoUrl) current.fotoUrl = u.fotoUrl;
      }
    }

    return [...by.entries()]
      .map(([comunidad, meta]) => ({
        comunidad,
        total: meta.total,
        fotoUrl: meta.fotoUrl,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [usuarios]);

  // =========================
  // Donut Cuenta (CSS conic)
  // =========================
  const pct = (n: number) =>
    totalUsuarios > 0 ? (n / totalUsuarios) * 100 : 0;
  const pAct = pct(cuentaActivos);

  const donutBg =
    totalUsuarios > 0
      ? `conic-gradient(#16a34a 0% ${pAct}%, #ef4444 ${pAct}% 100%)`
      : `conic-gradient(rgba(15,23,42,0.12) 0 100%)`;

  // =========================
  // Bar chart data (registros)
  // =========================
  const lineData = useMemo(() => buildDailyRegistros(usuarios, 14), [usuarios]);

  const badgeCuentaClass = (s: EstadoUsuarioCuenta) =>
    s === "Activo" ? "badge badge-success" : "badge badge-danger";

  const badgeOnlineClass = (s: EstadoUsuarioOnline) =>
    s === "Activo" ? "badge badge-success" : "badge badge-danger";

  // =========================
  // Custom tick (foto + texto) para Top Comunidades
  // =========================
  const CommunityTick = (props: any) => {
    const { x, y, payload, index } = props;
    const name: string = payload?.value ?? "—";

    const item = topComunidades.find((t) => t.comunidad === name);
    const fotoUrl = item?.fotoUrl;
    const initial = (name?.trim()?.[0] ?? "C").toUpperCase();
    const clipId = `clip-comm-${index}`;

    return (
      <g transform={`translate(${x},${y})`}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={10} cy={0} r={10} />
          </clipPath>
        </defs>

        {fotoUrl ? (
          <>
            <circle cx={10} cy={0} r={10} fill="rgba(15,23,42,0.06)" />
            <image
              href={fotoUrl}
              x={0}
              y={-10}
              width={20}
              height={20}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
            <circle
              cx={10}
              cy={0}
              r={10}
              fill="transparent"
              stroke="rgba(255,255,255,0.85)"
            />
          </>
        ) : (
          <>
            <circle cx={10} cy={0} r={10} fill="rgba(148,163,184,0.35)" />
            <text
              x={10}
              y={4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="900"
              fill="rgba(15,23,42,0.72)"
            >
              {initial}
            </text>
            <circle
              cx={10}
              cy={0}
              r={10}
              fill="transparent"
              stroke="rgba(255,255,255,0.85)"
            />
          </>
        )}

        <text
          x={26}
          y={4}
          fontSize="12"
          fontWeight="900"
          fill="rgba(15,23,42,0.78)"
        >
          {name.length > 18 ? `${name.slice(0, 18)}…` : name}
        </text>
      </g>
    );
  };

  const ComunidadValueLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 10}
        y={y + 12}
        fontSize="12"
        fontWeight="950"
        fill="rgba(15,23,42,0.70)"
      >
        {Number(value ?? 0).toLocaleString("es-EC")}
      </text>
    );
  };

  // =========================
  // EXPORT MODAL PRO (Usuarios)
  // =========================
  type ExportFormato = "pdf" | "excel";
  type ExportContenido = "solo_tabla" | "completo" | "solo_registros";

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormato, setExportFormato] = useState<ExportFormato>("pdf");
  const [exportContenido, setExportContenido] =
    useState<ExportContenido>("completo");

  // Solo queda esta opción (como pediste)
  const [exportUsarFiltros, setExportUsarFiltros] = useState(true);

  const getExportSource = () =>
    exportUsarFiltros ? usuariosFiltrados : usuarios;

  const buildExportRows = (source: UsuarioUI[]) =>
    source.map((u) => ({
      Nombre: u.nombre ?? "—",
      Correo: u.email ?? "—",
      Telefono: u.telefono ?? "—",
      Comunidad: u.comunidad ?? "—",
      Rol: u.rol ?? "—",
      "Estado cuenta": u.estadoCuenta ?? "—",
      Online: u.estadoOnline ?? "—",
      Registro:
        `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
      "Ultimo acceso": u.ultimoAcceso ?? "—",
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

  // Captura DOM (donut/top comunidades) a PNG para PDF
  async function elementToPngDataUrl(
    el: HTMLElement,
    scale = 2,
  ): Promise<{ dataUrl: string; width: number; height: number }> {
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    return {
      dataUrl: canvas.toDataURL("image/png", 1.0),
      width: canvas.width,
      height: canvas.height,
    };
  }

  function addImageCentered(
    doc: jsPDF,
    dataUrl: string,
    y: number,
    maxW: number,
    maxH: number,
    imgWpx: number,
    imgHpx: number,
  ) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const ratio = imgWpx / imgHpx;
    let drawW = maxW;
    let drawH = drawW / ratio;

    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }

    if (y + drawH + 10 > pageH) {
      doc.addPage();
      y = 20;
    }

    const x = (pageW - drawW) / 2;
    doc.addImage(dataUrl, "PNG", x, y, drawW, drawH);

    return y + drawH + 10;
  }

  const exportExcelPro = () => {
    const source = getExportSource();

    const incluirTabla =
      exportContenido === "solo_tabla" || exportContenido === "completo";
    const incluirRegistros =
      exportContenido === "solo_registros" || exportContenido === "completo";

    const wb = XLSX.utils.book_new();

    // Tabla
    if (incluirTabla) {
      const rows = buildExportRows(source);
      const ws = XLSX.utils.json_to_sheet(rows);

      ws["!cols"] = [
        { wch: 26 },
        { wch: 32 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    }

    // Reporte completo: resumen + estado de cuenta + top comunidades
    if (exportContenido === "completo") {
      const wsResumen = XLSX.utils.json_to_sheet([
        { KPI: "Total usuarios", Valor: totalUsuarios },
        { KPI: "Cuenta activa", Valor: cuentaActivos },
        { KPI: "Suspendidos", Valor: cuentaSuspendidos },
        { KPI: `Online (≤ ${ONLINE_THRESHOLD_MIN} min)`, Valor: onlineActivos },
        {
          KPI: "Filtro aplicado",
          Valor: exportUsarFiltros ? "Sí (búsqueda/visibles)" : "No (todos)",
        },
        { KPI: "Registros exportados", Valor: source.length },
      ]);
      wsResumen["!cols"] = [{ wch: 28 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const wsEstadoCuenta = XLSX.utils.json_to_sheet([
        {
          Estado: "Activo",
          Total: cuentaActivos,
          Porcentaje: `${pAct.toFixed(1)}%`,
        },
        {
          Estado: "Suspendido",
          Total: cuentaSuspendidos,
          Porcentaje: `${(100 - pAct).toFixed(1)}%`,
        },
      ]);
      wsEstadoCuenta["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEstadoCuenta, "Estado_cuenta");

      const wsTop = XLSX.utils.json_to_sheet(
        topComunidades.map((t) => ({
          Comunidad: t.comunidad,
          Usuarios: t.total,
        })),
      );
      wsTop["!cols"] = [{ wch: 28 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsTop, "Top_comunidades");
    }

    // Registros 14d
    if (incluirRegistros) {
      const chartRows = lineData.map((p) => ({
        Dia: p.label,
        Registros: p.registros,
      }));
      const wsChart = XLSX.utils.json_to_sheet(chartRows);
      wsChart["!cols"] = [{ wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsChart, "Registros_14_dias");
    }

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_usuarios_${stamp}.xlsx`);
  };

  const exportPDFPro = async () => {
    const source = getExportSource();

    const incluirTabla =
      exportContenido === "solo_tabla" || exportContenido === "completo";
    const incluirRegistros =
      exportContenido === "solo_registros" || exportContenido === "completo";

    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header logo centrado (igual Comunidades)
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
        ? "Reporte de Usuarios (Solo tabla)"
        : exportContenido === "solo_registros"
          ? "Reporte de Usuarios (Solo registros)"
          : "Reporte de Usuarios (Completo)",
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
      {
        align: "center",
      },
    );

    let cursorY = titleY + 18;

    // ✅ 1) RESUMEN (solo en "completo") — igual Comunidades
    if (exportContenido === "completo") {
      autoTable(doc, {
        startY: cursorY,
        head: [["Resumen", "Valor"]],
        body: [
          ["Total usuarios", String(totalUsuarios)],
          ["Cuenta activa", String(cuentaActivos)],
          ["Suspendidos", String(cuentaSuspendidos)],
          [`Online (≤ ${ONLINE_THRESHOLD_MIN} min)`, String(onlineActivos)],
          [
            "Filtro aplicado",
            exportUsarFiltros
              ? busqueda?.trim() || "Sí (búsqueda/visibles)"
              : "No (todos)",
          ],
          ["Registros exportados", `${source.length} de ${usuarios.length}`],
        ],
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

    // ✅ 2) TABLA USUARIOS (si aplica)
    if (incluirTabla) {
      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            "Nombre",
            "Correo",
            "Teléfono",
            "Comunidad",
            "Rol",
            "Estado cuenta",
            "Online",
            "Registro",
            "Último acceso",
          ],
        ],
        body: source.map((u) => [
          u.nombre ?? "—",
          u.email ?? "—",
          u.telefono ?? "—",
          u.comunidad ?? "—",
          u.rol ?? "—",
          u.estadoCuenta ?? "—",
          u.estadoOnline ?? "—",
          `${u.fechaRegistro ?? ""} ${u.horaRegistro ?? ""}`.trim() || "—",
          u.ultimoAcceso ?? "—",
        ]),
        styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 42 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 16 },
          5: { cellWidth: 18 },
          6: { cellWidth: 14 },
          7: { cellWidth: 18 },
          8: { cellWidth: 20 },
        },
      });

      cursorY =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ??
          cursorY) + 10;
    }

    // ✅ 3) ESTADO DE CUENTA (tabla) + TOP COMUNIDADES (tabla) — SOLO en completo
    if (exportContenido === "completo") {
      // salto de página si no entra
      if (cursorY + 40 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Estado de cuenta (resumen)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 4;

      const total = totalUsuarios || 1;
      const pctLocal = (n: number) => `${Math.round((n / total) * 100)}%`;

      autoTable(doc, {
        startY: cursorY + 4,
        head: [["Estado", "Cantidad", "Porcentaje"]],
        body: [
          ["Activos", String(cuentaActivos), pctLocal(cuentaActivos)],
          [
            "Suspendidos",
            String(cuentaSuspendidos),
            pctLocal(cuentaSuspendidos),
          ],
        ],
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

      if (cursorY + 40 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Top comunidades (usuarios)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 4;

      autoTable(doc, {
        startY: cursorY + 4,
        head: [["Comunidad", "Usuarios"]],
        body: (topComunidades?.length ? topComunidades : []).map((t) => [
          t.comunidad ?? "—",
          String(t.total ?? 0),
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 30, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      });

      cursorY =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ??
          cursorY) + 10;
    }

    // ✅ 4) REGISTROS (GRÁFICA) — imagen SOLO para esta sección (igual Comunidades)
    if (incluirRegistros) {
      if (cursorY + 90 > pageH) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Registros de usuarios (últimos 14 días)", pageW / 2, cursorY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      cursorY += 6;

      try {
        const svg = chartRegistrosRef.current?.querySelector(
          "svg",
        ) as SVGSVGElement | null;

        if (svg) {
          const { dataUrl } = await svgToPngDataUrl(svg, 2);
          const maxW = pageW - 28;
          const imgW = maxW;
          const imgH = 72; // altura pro fija (como en Comunidades)
          const x = (pageW - imgW) / 2;
          doc.addImage(dataUrl, "PNG", x, cursorY, imgW, imgH);
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

      // tabla completa 14d (igual que la gráfica)
      let y = cursorY;

      autoTable(doc, {
        startY: y,
        head: [["Día", "Registros"]],
        body: lineData.map((p) => [p.label, String(p.registros)]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 40, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      });

      y =
        (((doc as any)?.lastAutoTable?.finalY as number | undefined) ?? y) + 10;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_usuarios_${stamp}.pdf`);
  };

  const canExport =
    (exportUsarFiltros ? usuariosFiltrados.length : usuarios.length) > 0;

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
        <main className="usuarios-main">
          <motion.div
            className="usuarios-panel card"
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
                  <div className="page-title">Usuarios</div>

                  <div className={`search-pill-v2 ${busqueda ? "open" : ""}`}>
                    <span className="search-ico-v2" aria-hidden="true">
                      <Search size={18} />
                    </span>

                    <input
                      type="text"
                      className="search-input-v2"
                      placeholder="Buscar por nombre, correo o comunidad..."
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
                  <button
                    className="action-pill"
                    onClick={() => setExportOpen(true)}
                    disabled={!canExport}
                    title="Exportar reporte"
                    type="button"
                  >
                    <Download size={18} />
                    Exportar
                  </button>

                  <button
                    className="action-pill action-pill-accent"
                    onClick={cargarUsuarios}
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

            {error && <p className="ui-error">{error}</p>}

            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Total usuarios</span>
                  <div className="kpi-icon kpi-total" aria-hidden="true">
                    <Users size={24} />
                  </div>
                </div>
                <div className="kpi-value">{totalUsuarios}</div>
                <div className="kpi-sub">Registrados en el sistema</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Cuenta activa</span>
                  <div className="kpi-icon kpi-ok" aria-hidden="true">
                    <UserCheck size={24} />
                  </div>
                </div>
                <div className="kpi-value">{cuentaActivos}</div>
                <div className="kpi-sub">Acceso habilitado</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Suspendidos</span>
                  <div className="kpi-icon kpi-bad" aria-hidden="true">
                    <UserX size={24} />
                  </div>
                </div>
                <div className="kpi-value">{cuentaSuspendidos}</div>
                <div className="kpi-sub">Acceso restringido</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-head">
                  <span className="kpi-label">Online (aprox)</span>
                  <div className="kpi-icon kpi-warn" aria-hidden="true">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="kpi-value">{onlineActivos}</div>
                <div className="kpi-sub">
                  Último acceso ≤ {ONLINE_THRESHOLD_MIN} min
                </div>
              </div>
            </div>

            {/* ✅ SWAP: TABLA (izquierda) + SIDE CARD (derecha) */}
            <div className="grid-2col">
              {/* ✅ TABLA en el lugar de la gráfica */}
              <section className="chart-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Listado de usuarios</div>
                    <div className="chart-sub-v2">
                      Resultados: <b>{usuariosFiltrados.length}</b>
                    </div>
                  </div>
                </div>

                <section className="tabla-panel tabla-panel-in-chart">
                  <div className="tabla-inner">
                    <table className="usuarios-tabla">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Comunidad</th>
                          <th style={{ textAlign: "center" }}>Online</th>
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
                              Cargando usuarios...
                            </td>
                          </tr>
                        ) : usuariosFiltrados.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ textAlign: "center", fontWeight: 900 }}
                            >
                              No se encontraron usuarios.
                            </td>
                          </tr>
                        ) : (
                          usuariosFiltrados.map((u) => {
                            const isSusp = u.estadoCuenta === "Suspendido";

                            return (
                              <tr
                                key={u.id}
                                className={isSusp ? "row-suspended" : ""}
                              >
                                <td title={u.nombre} className="cell-ellipsis">
                                  {u.nombre}
                                </td>

                                <td title={u.email} className="cell-ellipsis">
                                  {u.email}
                                </td>

                                <td
                                  title={u.comunidad}
                                  className="cell-ellipsis"
                                >
                                  {u.comunidad}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                  <span
                                    className={badgeOnlineClass(u.estadoOnline)}
                                    title={
                                      u.ultimoAccesoIso
                                        ? `Último acceso: ${u.ultimoAccesoIso}`
                                        : "Sin registro de acceso"
                                    }
                                  >
                                    {u.estadoOnline}
                                  </span>
                                </td>

                                <td style={{ textAlign: "center" }}>
                                  <button
                                    className="sz-mini-btn"
                                    type="button"
                                    onClick={() => openView(u)}
                                    title="Ver detalles"
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </section>

              {/* ✅ SIDE CARD igual (donut + top comunidades) */}
              <section className="side-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Estado de cuenta</div>
                    <div className="chart-sub-v2">Distribución global</div>
                  </div>
                </div>

                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{ background: donutBg }}
                    aria-label="Donut cuenta"
                  >
                    <div className="donut-hole">
                      <div className="donut-total2">{totalUsuarios}</div>
                      <div className="donut-label2">Usuarios</div>
                    </div>
                  </div>

                  <div className="donut-legend">
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#16a34a" }}
                      />
                      <span className="donut-name">Activos</span>
                      <span className="donut-val">{cuentaActivos}</span>
                    </div>
                    <div className="donut-li">
                      <span
                        className="donut-dot"
                        style={{ background: "#ef4444" }}
                      />
                      <span className="donut-name">Suspendidos</span>
                      <span className="donut-val">{cuentaSuspendidos}</span>
                    </div>
                  </div>
                </div>

                <div className="topbars">
                  <div className="topbars-head">
                    <div>
                      <div className="topbars-title">Top comunidades</div>
                      <div className="topbars-sub">Usuarios por comunidad</div>
                    </div>
                  </div>

                  <div className="topbars-chart">
                    {topComunidades.length === 0 ? (
                      <div className="toplist-empty">Sin datos</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={topComunidades}
                          layout="vertical"
                          margin={{ top: 4, right: 28, left: -60, bottom: 0 }}
                          barCategoryGap={12}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="comunidad"
                            axisLine={false}
                            tickLine={false}
                            width={90}
                            tick={CommunityTick}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(15,23,42,0.04)" }}
                            content={<ComunidadesTooltip />}
                          />
                          <Bar
                            dataKey="total"
                            fill="rgba(16,185,129,0.40)"
                            radius={[12, 12, 12, 12]}
                            background={{ fill: "rgba(15,23,42,0.06)" }}
                            barSize={16}
                            animationDuration={650}
                          >
                            <LabelList
                              dataKey="total"
                              content={ComunidadValueLabel}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* ✅ SWAP: GRÁFICA ahora en el lugar donde estaba la tabla (full ancho) */}
            <section className="chart-card-v2 card chart-card-full">
              <div className="chart-head">
                <div>
                  <div className="chart-title-v2">Registros de usuarios</div>
                  <div className="chart-sub-v2">Últimos 14 días</div>
                </div>
              </div>

              <div className="line-chart-wrap" ref={chartRegistrosRef}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={lineData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.18}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickMargin={10}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(249,81,80,0.08)" }}
                      content={<RegistrosTooltip />}
                    />
                    <Bar
                      dataKey="registros"
                      fill="#f95150"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={34}
                      animationDuration={650}
                      background={{ fill: "rgba(15,23,42,0.06)" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <p className="usuarios-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </motion.div>
        </main>
      </div>

      {/* ✅ MODAL EXPORTACIÓN PRO (igual a Comunidades) */}
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExportOpen(false)}
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
                  <div className="sz-modal-title">Exportación de reporte</div>
                  <div className="sz-modal-sub">
                    Elige qué quieres exportar. Se respeta logo/encabezado y el
                    formato actual.
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => setExportOpen(false)}
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
                    className={`sz-export-item ${exportFormato === "pdf" ? "active" : ""}`}
                    onClick={() => setExportFormato("pdf")}
                  >
                    <span
                      className={`sz-switch ${exportFormato === "pdf" ? "on" : ""}`}
                    >
                      {exportFormato === "pdf" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <FileText size={18} />
                    </span>

                    <span className="sz-export-name">PDF (presentación)</span>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${exportFormato === "excel" ? "active" : ""}`}
                    onClick={() => setExportFormato("excel")}
                  >
                    <span
                      className={`sz-switch ${exportFormato === "excel" ? "on" : ""}`}
                    >
                      {exportFormato === "excel" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <FileSpreadsheet size={18} />
                    </span>

                    <span className="sz-export-name">Excel (datos)</span>
                  </button>
                </div>

                {/* CONTENIDO */}
                <div className="sz-export-col">
                  <div className="sz-export-title">
                    <span className="sz-dot" />
                    Contenido
                  </div>

                  <button
                    type="button"
                    className={`sz-export-item ${
                      exportContenido === "solo_tabla" ? "active" : ""
                    }`}
                    onClick={() => setExportContenido("solo_tabla")}
                  >
                    <span
                      className={`sz-switch ${exportContenido === "solo_tabla" ? "on" : ""}`}
                    >
                      {exportContenido === "solo_tabla" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <Table2 size={18} />
                    </span>

                    <span className="sz-export-name">
                      Solo tabla (usuarios)
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${
                      exportContenido === "completo" ? "active" : ""
                    }`}
                    onClick={() => setExportContenido("completo")}
                  >
                    <span
                      className={`sz-switch ${exportContenido === "completo" ? "on" : ""}`}
                    >
                      {exportContenido === "completo" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <LayoutDashboard size={18} />
                    </span>

                    <span className="sz-export-name">
                      Reporte completo (tabla + estado de cuenta + top
                      comunidades + registros)
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`sz-export-item ${
                      exportContenido === "solo_registros" ? "active" : ""
                    }`}
                    onClick={() => setExportContenido("solo_registros")}
                  >
                    <span
                      className={`sz-switch ${exportContenido === "solo_registros" ? "on" : ""}`}
                    >
                      {exportContenido === "solo_registros" ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                    </span>

                    <span className="sz-export-ico">
                      <LineChartIcon size={18} />
                    </span>

                    <span className="sz-export-name">
                      Solo registros (gráfica de abajo)
                    </span>
                  </button>
                </div>
              </div>

              {/* OPCIONES */}
              <div className="sz-export-options">
                <div className="sz-export-title" style={{ marginBottom: 10 }}>
                  <span className="sz-dot" />
                  Opciones
                </div>

                <button
                  type="button"
                  className={`sz-opt ${exportUsarFiltros ? "on" : ""}`}
                  onClick={() => setExportUsarFiltros((v) => !v)}
                >
                  <span
                    className={`sz-switch ${exportUsarFiltros ? "on" : ""}`}
                  >
                    {exportUsarFiltros ? (
                      <ToggleRight size={18} />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </span>
                  <span className="sz-opt-text">
                    Usar filtros actuales (búsqueda / resultados visibles)
                  </span>
                </button>

                <div className="sz-export-count">
                  Registros a exportar:{" "}
                  <b>
                    {exportUsarFiltros
                      ? usuariosFiltrados.length
                      : usuarios.length}
                  </b>{" "}
                  de{" "}
                  <b>
                    {exportUsarFiltros
                      ? usuariosFiltrados.length
                      : usuarios.length}
                  </b>
                </div>
              </div>

              {/* FOOTER */}
              <div className="sz-export-footer">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setExportOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  className="sz-btn-accent"
                  type="button"
                  onClick={exportNow}
                  disabled={!canExport}
                  title="Exportar ahora"
                >
                  Exportar ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL VER DETALLE USUARIO (con suspender dentro) */}
      <AnimatePresence>
        {viewOpen && viewTarget && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeView}
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
                  <div className="sz-modal-title">Detalle de usuario</div>
                  <div className="sz-modal-sub">
                    Correo: <b>{viewTarget.email ?? "—"}</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={closeView}
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
                      alt="Foto usuario"
                      className="sz-view-photo"
                    />
                  ) : (
                    <div className="sz-view-photo sz-view-photoEmpty" />
                  )}
                </div>

                <div className="sz-view-name">{viewTarget.nombre ?? "—"}</div>
              </div>

              {viewError && <div className="sz-modal-error">{viewError}</div>}

              <div className="sz-view-grid">
                <div className="sz-view-item">
                  <span>Comunidad</span>
                  <div>{viewTarget.comunidad ?? "—"}</div>
                </div>

                <div className="sz-view-item">
                  <span>Teléfono</span>
                  <div>{viewTarget.telefono ?? "—"}</div>
                </div>

                <div className="sz-view-item">
                  <span>Rol</span>
                  <div>{viewTarget.rol ?? "—"}</div>
                </div>

                <div className="sz-view-item">
                  <span>Estado cuenta</span>
                  <div>
                    <span className={badgeCuentaClass(viewTarget.estadoCuenta)}>
                      {viewTarget.estadoCuenta}
                    </span>
                  </div>
                </div>

                <div className="sz-view-item">
                  <span>Online</span>
                  <div>
                    <span className={badgeOnlineClass(viewTarget.estadoOnline)}>
                      {viewTarget.estadoOnline}
                    </span>
                  </div>
                </div>

                <div className="sz-view-item">
                  <span>Último acceso</span>
                  <div>{viewTarget.ultimoAcceso ?? "—"}</div>
                </div>

                <div className="sz-view-item" style={{ gridColumn: "1 / -1" }}>
                  <span>Registro</span>
                  <div>
                    {`${viewTarget.fechaRegistro ?? ""} ${
                      viewTarget.horaRegistro ?? ""
                    }`.trim() || "—"}
                  </div>
                </div>
              </div>

              <div className="sz-modal-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={closeView}
                >
                  Cerrar
                </button>

                <button
                  className="sz-btn-danger"
                  type="button"
                  onClick={() => {
                    setConfirmError(null);
                    setConfirmOpen(true);
                  }}
                  disabled={
                    viewLoading || viewTarget.estadoCuenta === "Suspendido"
                  }
                  title={
                    viewTarget.estadoCuenta === "Suspendido"
                      ? "Usuario ya suspendido"
                      : "Suspender usuario"
                  }
                  style={
                    viewTarget.estadoCuenta === "Suspendido"
                      ? { opacity: 0.55, cursor: "not-allowed" }
                      : undefined
                  }
                >
                  {viewTarget.estadoCuenta === "Suspendido"
                    ? "Suspendido"
                    : "Suspender"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MODAL CONFIRMACIÓN SUSPENDER (PRO) */}
      <AnimatePresence>
        {confirmOpen && viewTarget && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !confirmLoading && setConfirmOpen(false)}
          >
            <motion.div
              className="sz-modal-card sz-modal-danger"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sz-modal-head">
                <div>
                  <div className="sz-modal-title">¿Suspender usuario?</div>
                  <div className="sz-modal-sub">
                    Estás por suspender a: <b>{viewTarget.nombre ?? "—"}</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => !confirmLoading && setConfirmOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sz-danger-box">
                <div className="sz-danger-name">{viewTarget.nombre ?? "—"}</div>

                <div className="sz-danger-meta">
                  Correo: <b>{viewTarget.email ?? "—"}</b>
                </div>

                <div className="sz-danger-meta">
                  Comunidad: {viewTarget.comunidad ?? "—"}
                </div>

                <div className="sz-danger-warning">
                  ⚠️ Al suspender, el usuario quedará <b>inactivo</b> y no podrá
                  iniciar sesión, pero <b>no se elimina</b> su información ni su
                  historial.
                </div>
              </div>

              {confirmError && (
                <div className="sz-modal-error">{confirmError}</div>
              )}

              <div className="sz-modal-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={confirmLoading}
                >
                  Cancelar
                </button>

                <button
                  className="sz-btn-danger"
                  type="button"
                  onClick={confirmSuspendUser}
                  disabled={confirmLoading}
                  title="Confirmar suspensión"
                >
                  {confirmLoading ? "Suspendiendo..." : "Sí, suspender"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
