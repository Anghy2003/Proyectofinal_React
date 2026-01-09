// src/pages/Usuarios.tsx
import "../styles/usuario.css";
import Sidebar from "../components/sidebar";

import logoSafeZone from "../assets/logo_SafeZone.png";
import iconImagen from "../assets/icon_imagen.svg";
import iconEliminar from "../assets/icon_eliminar2.svg";

import { useNavigate } from "react-router-dom";

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

type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

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
const ONLINE_THRESHOLD_MIN = 2;

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
    return {
      key: toKey(d),
      label: fmtLabel(d),
      registros: 0,
    };
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
  scale = 2
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

  // Fondo blanco para PDF
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  return {
    dataUrl: canvas.toDataURL("image/png", 1.0),
    width: w,
    height: h,
  };
}

export default function Usuarios() {
  const navigate = useNavigate();

  // ✅ sidebar móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Export dropdown
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ✅ Ref del chart (para export PDF)
  const chartRegistrosRef = useRef<HTMLDivElement | null>(null);

  const [me] = useState<SessionUser>(() => getSessionUser());

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

          // ✅ Estado CUENTA
          estadoCuenta: u.activo ? "Activo" : "Suspendido",

          // ✅ Estado ONLINE
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

  // ✅ recomputa estadoOnline cada 30s sin volver a pegar al backend
  useEffect(() => {
    const t = setInterval(() => {
      setUsuarios((prev) =>
        prev.map((u) => ({
          ...u,
          estadoOnline: getEstadoOnline(u.ultimoAccesoIso ?? null),
        }))
      );
    }, 30_000);
    return () => clearInterval(t);
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
    [usuarios]
  );

  const cuentaSuspendidos = useMemo(
    () => usuarios.filter((u) => u.estadoCuenta === "Suspendido").length,
    [usuarios]
  );

  const onlineActivos = useMemo(
    () => usuarios.filter((u) => u.estadoOnline === "Activo").length,
    [usuarios]
  );

  // =========================
  // ✅ Top comunidades (con foto representativa)
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
        // guarda primera foto disponible
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

  // =========================
  // EXPORT (sin foto) + ✅ hoja con datos de gráfica + ✅ PDF con gráfica
  // =========================
  const buildExportRows = () =>
    usuariosFiltrados.map((u) => ({
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

  const exportExcel = () => {
    // Hoja 1: tabla usuarios
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 26 }, // Nombre
      { wch: 32 }, // Correo
      { wch: 16 }, // Telefono
      { wch: 22 }, // Comunidad
      { wch: 16 }, // Rol
      { wch: 14 }, // Estado cuenta
      { wch: 10 }, // Online
      { wch: 18 }, // Registro
      { wch: 18 }, // Ultimo acceso
    ];

    // Hoja 2: datos de gráfica (últimos 14 días)
    const chartRows = lineData.map((p) => ({
      Dia: p.label,
      Registros: p.registros,
    }));
    const wsChart = XLSX.utils.json_to_sheet(chartRows);
    wsChart["!cols"] = [{ wch: 14 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.utils.book_append_sheet(wb, wsChart, "Grafica_14_dias");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte_usuarios_${stamp}.xlsx`);
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

    // ===== HEADER =====
    try {
      const logo = await toDataURL(logoSafeZone);
      // un poco más ancho
      doc.addImage(logo, "PNG", 92, 10, 26, 26);
    } catch {
      // ignore
    }

    doc.setFontSize(16);
    doc.text("Reporte de Usuarios", 105, 45, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 105, 52, {
      align: "center",
    });

    // ===== TABLA =====
    autoTable(doc, {
      startY: 60,
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
      body: usuariosFiltrados.map((u) => [
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

    // ===== GRAFICA AL FINAL =====
    const afterTableY = (doc as any).lastAutoTable?.finalY ?? 60;
    let y = afterTableY + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Gráfica de registros (últimos 14 días)", 105, y, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");

    y += 6;

    try {
      const svg = chartRegistrosRef.current?.querySelector(
        "svg"
      ) as SVGSVGElement | null;

      if (svg) {
        const { dataUrl, width, height } = await svgToPngDataUrl(svg, 2);

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        // tamaño objetivo en PDF
        const maxW = pageW - 20; // márgenes 10/10
        const maxH = 90; // alto máximo

        const ratio = width / height;
        let drawW = maxW;
        let drawH = drawW / ratio;

        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * ratio;
        }

        // si ya no cabe, nueva página
        if (y + drawH + 10 > pageH) {
          doc.addPage();
          y = 20;
        }

        const x = (pageW - drawW) / 2;
        doc.addImage(dataUrl, "PNG", x, y, drawW, drawH);
      }
    } catch {
      // si falla la captura, no detengas el PDF
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_usuarios_${stamp}.pdf`);
  };

  const canExport = usuariosFiltrados.length > 0;

  const badgeCuentaClass = (s: EstadoUsuarioCuenta) =>
    s === "Activo" ? "badge badge-success" : "badge badge-danger";

  const badgeOnlineClass = (s: EstadoUsuarioOnline) =>
    s === "Activo" ? "badge badge-success" : "badge badge-danger";

  const closeSidebar = () => setSidebarOpen(false);

  // =========================
  // ✅ Custom tick (foto + texto) para Top Comunidades
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

        {/* avatar */}
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

        {/* label */}
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

            {/* Charts + Side card */}
            <div className="grid-2col">
              <section className="chart-card-v2 card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Registros de usuarios</div>
                    <div className="chart-sub-v2">Últimos 14 días</div>
                  </div>
                </div>

                {/* ✅ ref para exportar la gráfica al PDF */}
                <div className="line-chart-wrap" ref={chartRegistrosRef}>
                  <ResponsiveContainer width="100%" height="100%">
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
                        tick={{
                          fill: "rgba(15,23,42,0.65)",
                          fontSize: 12,
                          fontWeight: 700,
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
                          fontWeight: 700,
                        }}
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

                {/* ✅ TOP COMUNIDADES (estilo imagen: barras horizontales + valor a la derecha + foto) */}
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
                      <ResponsiveContainer width="100%" height="100%">
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

            {/* Tabla */}
            <section className="usuarios-card">
              {loading ? (
                <div className="ui-loading">Cargando usuarios…</div>
              ) : (
                <table className="usuarios-tabla">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Comunidad</th>
                      <th>Rol</th>
                      <th>Cuenta</th>
                      <th>Online</th>
                      <th>Registro</th>
                      <th>Último acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.fotoUrl ? (
                            <img
                              src={u.fotoUrl}
                              alt="foto"
                              className="user-photo-icon"
                            />
                          ) : (
                            <img
                              src={iconImagen}
                              alt="foto"
                              className="user-photo-icon"
                            />
                          )}
                        </td>

                        <td title={u.nombre}>{u.nombre}</td>
                        <td title={u.email}>{u.email}</td>
                        <td title={u.telefono}>{u.telefono}</td>
                        <td title={u.comunidad}>{u.comunidad}</td>
                        <td>{u.rol}</td>

                        <td>
                          <span className={badgeCuentaClass(u.estadoCuenta)}>
                            {u.estadoCuenta}
                          </span>
                        </td>

                        <td>
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

                        <td>
                          {u.fechaRegistro || "—"}
                          <br />
                          <span className="time">{u.horaRegistro || ""}</span>
                        </td>

                        <td title={u.ultimoAcceso}>{u.ultimoAcceso}</td>

                        <td className="acciones">
                          <button
                            className="icon-button"
                            title="Eliminar"
                            onClick={() =>
                              alert("Eliminar usuario: pendiente backend")
                            }
                            type="button"
                          >
                            <img src={iconEliminar} alt="Eliminar" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {usuariosFiltrados.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          style={{ textAlign: "center", fontWeight: 900 }}
                        >
                          No se encontraron usuarios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </section>

            <p className="usuarios-update">
              Última actualización: {new Date().toLocaleString("es-EC")}
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
