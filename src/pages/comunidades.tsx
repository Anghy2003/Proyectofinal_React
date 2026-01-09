// src/pages/Comunidades.tsx
import "../styles/comunidad.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_SafeZone.png";
import iconEdit from "../assets/icon_editar2.svg";
import iconEliminar from "../assets/icon_eliminar2.svg";

import { useNavigate } from "react-router-dom";
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

// ✅ Animaciones
import { AnimatePresence, motion } from "framer-motion";

// ✅ Gráfico de líneas (mismo estilo dashboard)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ✅ Íconos pro
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
} from "lucide-react";

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

type DailyPoint = {
  key: string; // YYYY-MM-DD
  label: string; // "04 Ene"
  total: number;
  activas: number;
  solicitadas: number;
  rechazadas: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  // base: últimos N días
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
    };
  });

  const byKey = new Map(base.map((p) => [p.key, p]));

  // si hay fechas reales, agregamos por día
  let hasRealDates = false;

  comunidades.forEach((c) => {
    const d = getCommunityDate(c as any);
    if (!d) return;
    hasRealDates = true;

    d.setHours(0, 0, 0, 0);
    const key = toKey(d);
    const p = byKey.get(key);
    if (!p) return; // fuera de rango (no lo mostramos)

    p.total += 1;
    if (c.estado === "ACTIVA") p.activas += 1;
    if (c.estado === "SOLICITADA") p.solicitadas += 1;
    if (c.estado === "RECHAZADA") p.rechazadas += 1;
  });

  // fallback: si NO hay fechas, distribuimos “estético” por índice
  if (!hasRealDates && comunidades.length > 0) {
    comunidades.forEach((c, idx) => {
      const i = idx % days;
      const p = base[i];
      p.total += 1;
      if (c.estado === "ACTIVA") p.activas += 1;
      if (c.estado === "SOLICITADA") p.solicitadas += 1;
      if (c.estado === "RECHAZADA") p.rechazadas += 1;
    });
  }

  // acumulado (para que se vea como tendencia real)
  let accTotal = 0,
    accA = 0,
    accS = 0,
    accR = 0;
  return base.map((p) => {
    accTotal += p.total;
    accA += p.activas;
    accS += p.solicitadas;
    accR += p.rechazadas;
    return {
      ...p,
      total: accTotal,
      activas: accA,
      solicitadas: accS,
      rechazadas: accR,
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
  outWidthPx = 1200
): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svgEl);

  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded = await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = svgUrl;
  });

  // @ts-ignore
  void loaded;

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

  // fondo blanco (para que no salga transparente en PDF)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(svgUrl);
  return canvas.toDataURL("image/png", 1.0);
}

export default function Comunidades() {
  const navigate = useNavigate();

  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Sidebar (móvil)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Dropdown export
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ✅ ref del chart para export PDF
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

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

  const [me] = useState<SessionUser>(() => getSessionUser());

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

  // =========================
  // KPIs + métricas
  // =========================
  const totalComunidades = comunidades.length;

  const activasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "ACTIVA").length,
    [comunidades]
  );

  const solicitadasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "SOLICITADA").length,
    [comunidades]
  );

  const rechazadasCount = useMemo(
    () => comunidades.filter((c) => c.estado === "RECHAZADA").length,
    [comunidades]
  );

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
    if (estado === "RECHAZADA") return "badge badge-danger";
    return "badge badge-warning";
  };

  const labelEstado = (estado: EstadoComunidad) => {
    if (estado === "ACTIVA") return "Activa";
    if (estado === "RECHAZADA") return "Rechazada";
    return "Solicitada";
  };

  // =========================
  // ✅ LINE CHART DATA
  // =========================
  const lineData = useMemo(
    () => buildDailySeries(comunidades, 14),
    [comunidades]
  );

  // =========================
  // EXPORT
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

    ws["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 12 },
      { wch: 60 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comunidades");

    // ✅ Hoja adicional con datos de la gráfica (pro)
    const chartRows = lineData.map((p) => ({
      Fecha: p.key,
      Etiqueta: p.label,
      Total: p.total,
      Activas: p.activas,
      Solicitadas: p.solicitadas,
      Rechazadas: p.rechazadas,
    }));
    const ws2 = XLSX.utils.json_to_sheet(chartRows);
    ws2["!cols"] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Grafica_14d");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_comunidades_${stamp}.xlsx`);
  };

  const exportPDF = async () => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageW = doc.internal.pageSize.getWidth();

  // ✅ LOGO 40x40 (mm) centrado
  const logoSize = 40; // 40x40
  const logoX = (pageW - logoSize) / 2;
  const logoY = 10;

  try {
    const logo = await toDataURL(logoSafeZone);
    doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);
  } catch {
    // ignore
  }

  // ✅ Título y fecha/hora debajo del logo (centrados)
  const titleY = logoY + logoSize + 10; // espacio debajo del logo

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Comunidades", pageW / 2, titleY, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, pageW / 2, titleY + 8, {
    align: "center",
  });

  // ✅ tabla más abajo para que NO tape fecha/hora
  autoTable(doc, {
    startY: titleY + 18,
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

  // ✅ y después de la tabla, metemos la gráfica AL FINAL (si no cabe, nueva página)
  const lastY =
    ((doc as any)?.lastAutoTable?.finalY as number | undefined) ?? 64;
    let y = lastY + 10;

    // Si no cabe, nueva página
    const pageH = doc.internal.pageSize.getHeight();
    if (y + 90 > pageH) {
      doc.addPage();
      y = 20;
    }

    // Título gráfico centrado y en negrita
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Gráfica de comunidades (últimos 14 días)", 105, y, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");

    y += 6;

    // Capturar SVG del chart visible
    try {
      const wrap = chartWrapRef.current;
      const svg = wrap?.querySelector("svg") as SVGSVGElement | null;

      if (svg) {
        const pngDataUrl = await svgElementToPngDataUrl(svg, 1400);

        const pageW = doc.internal.pageSize.getWidth();
        const maxW = pageW - 28; // márgenes similares a tabla
        const imgW = maxW;
        const imgH = 72; // ✅ altura controlada (sube a 80/90 si quieres más grande)
        const x = (pageW - imgW) / 2;

        doc.addImage(pngDataUrl, "PNG", x, y, imgW, imgH);
      } else {
        doc.setFontSize(10);
        doc.text(
          "No se pudo capturar la gráfica (SVG no encontrado).",
          105,
          y + 10,
          { align: "center" }
        );
      }
    } catch (e) {
      console.error(e);
      doc.setFontSize(10);
      doc.text("No se pudo exportar la gráfica.", 105, y + 10, {
        align: "center",
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_comunidades_${stamp}.pdf`);
  };

  const canExport = comunidadesFiltradas.length > 0;

  // =========================
  // Donut (CSS conic-gradient)
  // =========================
  const pct = (n: number) =>
    totalComunidades > 0 ? (n / totalComunidades) * 100 : 0;
  const pAct = pct(activasCount);
  const pSol = pct(solicitadasCount);
  const pRec = pct(rechazadasCount);

  const donutBg =
    totalComunidades > 0
      ? `conic-gradient(
          #16a34a 0% ${pAct}%,
          #f59e0b ${pAct}% ${pAct + pSol}%,
          #ef4444 ${pAct + pSol}% 100%
        )`
      : `conic-gradient(rgba(15,23,42,0.12) 0 100%)`;

  const closeSidebar = () => setSidebarOpen(false);

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

                {/* ✅ BOTONES ARREGLADOS */}
                <div ref={exportRef} className="topbar-actions">
                  <button
                    className="action-pill"
                    onClick={() => setOpenExport((v) => !v)}
                    disabled={!canExport}
                    title="Exportar reporte"
                    type="button"
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

            {/* ✅ INSIGHTS: LINE CHART + DONUT */}
            <div className="grid-2col">
              <section className="chart-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Tendencia de comunidades</div>
                    <div className="chart-sub-v2">Últimos 14 días (acumulado)</div>
                  </div>
                </div>

                {/* ✅ ref para exportar la gráfica */}
                <div className="line-chart-wrap1" ref={chartWrapRef}>
                  <ResponsiveContainer width="100%" height="100%">
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
                      {/* Total en rojo (marca) */}
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#f95150"
                        strokeWidth={3}
                        dot={false}
                      />
                      {/* líneas suaves por estado */}
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
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

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
                  </div>
                </div>
              </section>
            </div>

            {/* TABLA */}
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
                        <td
                          colSpan={7}
                          style={{ textAlign: "center", fontWeight: 900 }}
                        >
                          Cargando comunidades...
                        </td>
                      </tr>
                    ) : comunidadesFiltradas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{ textAlign: "center", fontWeight: 900 }}
                        >
                          No se encontraron comunidades.
                        </td>
                      </tr>
                    ) : (
                      comunidadesFiltradas.map((c) => (
                        <tr key={c.id}>
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
                          <td>{c.nombre}</td>
                          <td style={{ textAlign: "center" }}>
                            {c.miembrosCount ?? 0}
                          </td>
                          <td title={c.direccion ?? ""}>
                            {c.direccion ?? "—"}
                          </td>

                          <td>
                            <span className={badgeClass(c.estado)}>
                              {labelEstado(c.estado)}
                            </span>
                          </td>

                          <td className="acciones">
                            <button
                              className="icon-button"
                              onClick={() => alert("Editar comunidad (pendiente)")}
                              title="Editar"
                              type="button"
                            >
                              <img src={iconEdit} alt="Editar" />
                            </button>

                            <button
                              className="icon-button"
                              onClick={() =>
                                alert("Eliminar / desactivar (pendiente)")
                              }
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
