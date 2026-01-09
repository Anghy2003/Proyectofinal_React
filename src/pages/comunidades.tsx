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
  label: string; // "04 Ene"
  total: number;
  activas: number;
  solicitadas: number;
  rechazadas: number;
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
  });

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
  const navigate = useNavigate();

  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar (móvil)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dropdown export
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ref del chart para export PDF
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  // MODAL EDITAR
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState<Comunidad | null>(null);

  // MODAL ELIMINAR
  const [delOpen, setDelOpen] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<Comunidad | null>(null);

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

  const openDelete = (c: Comunidad) => {
    setDelError(null);
    setDelTarget(c);
    setDelOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!delTarget) return;

      setDelLoading(true);
      setDelError(null);

      const usuarioId = getAdminUserIdOrThrow();

      await comunidadesService.eliminar(delTarget.id, usuarioId);

      // ✅ quitar de la tabla sin recargar
      setComunidades((prev) => prev.filter((x) => x.id !== delTarget.id));

      setDelOpen(false);
      setDelTarget(null);
    } catch (e: any) {
      console.error(e);
      setDelError(
        e?.message ||
          "No se pudo eliminar la comunidad. Puede tener restricciones o relaciones."
      );
    } finally {
      setDelLoading(false);
    }
  };

  function getSessionUser(): SessionUser {
    const s = getSession();
    if (s) {
      return {
        nombre: `${s.nombre} ${s.apellido}`.trim(),
        rol: s.rol ?? "ADMIN",
        fotoUrl: s.fotoUrl ?? undefined,
        email: s.email,
      };
    }
    return { nombre: "Equipo SafeZone", rol: "ADMIN" };
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

  // ✅ Cerrar dropdown export al click fuera / ESC
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

  // ✅ Cerrar modal editar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditOpen(false);
    };
    if (editOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

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

    const logoSize = 40;
    const logoX = (pageW - logoSize) / 2;
    const logoY = 10;

    try {
      const logo = await toDataURL(logoSafeZone);
      doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);
    } catch {}

    const titleY = logoY + logoSize + 10;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Comunidades", pageW / 2, titleY, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generado: ${new Date().toLocaleString("es-EC")}`,
      pageW / 2,
      titleY + 8,
      {
        align: "center",
      }
    );

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

    const lastY =
      ((doc as any)?.lastAutoTable?.finalY as number | undefined) ?? 64;
    let y = lastY + 10;

    const pageH = doc.internal.pageSize.getHeight();
    if (y + 90 > pageH) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Gráfica de comunidades (últimos 14 días)", 105, y, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    y += 6;

    try {
      const wrap = chartWrapRef.current;
      const svg = wrap?.querySelector("svg") as SVGSVGElement | null;

      if (svg) {
        const pngDataUrl = await svgElementToPngDataUrl(svg, 1400);
        const pageW2 = doc.internal.pageSize.getWidth();
        const maxW = pageW2 - 28;
        const imgW = maxW;
        const imgH = 72;
        const x = (pageW2 - imgW) / 2;
        doc.addImage(pngDataUrl, "PNG", x, y, imgW, imgH);
      } else {
        doc.setFontSize(10);
        doc.text(
          "No se pudo capturar la gráfica (SVG no encontrado).",
          105,
          y + 10,
          {
            align: "center",
          }
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

  const donutBg =
    totalComunidades > 0
      ? `conic-gradient(
          #16a34a 0% ${pAct}%,
          #f59e0b ${pAct}% ${pAct + pSol}%,
          #ef4444 ${pAct + pSol}% 100%
        )`
      : `conic-gradient(rgba(15,23,42,0.12) 0 100%)`;

  // =========================
  // ✅ EDIT (modal)
  // =========================
  const openEdit = async (c: Comunidad) => {
    try {
      setEditError(null);

      // ✅ Traer versión más completa del backend
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

      // PAYLOAD SEGURO 
      const payload = {
        id: editOriginal.id,
        nombre: trim(editForm.nombre),
        direccion: trim(editForm.direccion) || null,

        // conservar campos existentes para que NO se borren
        codigoAcceso: editOriginal.codigoAcceso ?? null,  
        fotoUrl: editOriginal.fotoUrl ?? null,
        radioKm: (editOriginal.radioKm ?? 1.0) as any,
        activa: (editOriginal.activa ?? true) as any,
        estado: (editOriginal.estado ?? "ACTIVA") as any,
        solicitadaPorUsuarioId: (editOriginal.solicitadaPorUsuarioId ??
          null) as any,

        // CLAVE: conservar fecha
        fechaCreacion: (editOriginal.fechaCreacion ?? null) as any,
      };

      const updated = await comunidadesService.actualizar(
        editForm.id,
        usuarioId,
        payload
      );

      // ✅ Actualiza tabla sin recargar
      setComunidades((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
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

                {/* ✅ BOTONES */}
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
                    <div className="chart-title-v2">
                      Tendencia de comunidades
                    </div>
                    <div className="chart-sub-v2">
                      Últimos 14 días (acumulado)
                    </div>
                  </div>
                </div>

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
                              onClick={() => openEdit(c)}
                              title="Editar"
                              type="button"
                            >
                              <img src={iconEdit} alt="Editar" />
                            </button>

                            <button
                              className="icon-button icon-danger"
                              onClick={() => openDelete(c)}
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

      {/* ✅ MODAL EDITAR (solo campos de la tabla) */}
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
                {/* FOTO (bloqueado) */}
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

                {/* CÓDIGO (bloqueado) */}
                <label className="sz-field">
                  <span>Código (bloqueado)</span>
                  <input
                    value={editForm.codigoAcceso || "—"}
                    disabled
                    className="sz-input"
                  />
                </label>

                {/* MIEMBROS (bloqueado) */}
                <label className="sz-field">
                  <span>Miembros (bloqueado)</span>
                  <input
                    value={String(editForm.miembrosCount ?? 0)}
                    disabled
                    className="sz-input"
                  />
                </label>

                {/* NOMBRE (editable) */}
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

                {/* DIRECCIÓN (editable) */}
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

      <AnimatePresence>
        {delOpen && (
          <motion.div
            className="sz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDelOpen(false)}
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
                  <div className="sz-modal-title">¿Eliminar comunidad?</div>
                  <div className="sz-modal-sub">
                    Estás por eliminar: <b>{delTarget?.nombre ?? "—"}</b>
                  </div>
                </div>

                <button
                  className="sz-modal-x"
                  type="button"
                  onClick={() => setDelOpen(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sz-danger-box">
                <div className="sz-danger-name">{delTarget?.nombre ?? "—"}</div>
                <div className="sz-danger-meta">
                  Miembros dentro de la comunidad:{" "}
                  <b>{delTarget?.miembrosCount ?? 0}</b>
                </div>
                <div className="sz-danger-meta">
                  Dirección: {delTarget?.direccion ?? "—"}
                </div>
                <div className="sz-danger-meta">
                  Código: <b>{delTarget?.codigoAcceso ?? "—"}</b>
                </div>

                {(delTarget?.miembrosCount ?? 0) > 0 && (
                  <div className="sz-danger-warning">
                    ⚠️ Esta comunidad tiene miembros. Si la eliminas, podrían
                    quedar usuarios sin comunidad.
                  </div>
                )}
              </div>

              {delError && <div className="sz-modal-error">{delError}</div>}

              <div className="sz-modal-actions">
                <button
                  className="sz-btn-light"
                  type="button"
                  onClick={() => setDelOpen(false)}
                  disabled={delLoading}
                >
                  Cancelar
                </button>

                <button
                  className="sz-btn-danger"
                  type="button"
                  onClick={confirmDelete}
                  disabled={delLoading}
                  title="Eliminar definitivamente"
                >
                  {delLoading ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
