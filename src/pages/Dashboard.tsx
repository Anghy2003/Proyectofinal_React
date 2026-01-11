// src/pages/Dashboard.tsx
import "../styles/dashboard.css";
import Sidebar from "../components/sidebar";

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import { BarChart3, Users, MapPin, ShieldCheck } from "lucide-react";

import IncidentHeatmap from "../components/incidentemap";
import {
  dashboardService,
  type DashboardKpis,
} from "../services/dashboardService";
import type { IncidenteResponseDTO } from "../services/incidentesService";
import { usuariosService } from "../services/Usuario.Service";

/* ===============================
   Types
================================ */
type SessionUser = {
  nombre?: string;
  rol?: string;
  fotoUrl?: string;
  email?: string;
};

type RangeKey = "hoy" | "7d" | "30d";
type AnalyticsRange = "14d" | "1m" | "3m";

type NavItem = {
  label: string;
  path: string;
  keywords: string[];
};

/* ===============================
   Helpers fechas (LOCAL)
================================ */
function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function parseDateSafe(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso);
  return Number.isFinite(t.getTime()) ? t : null;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const monthLabels = [
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

function formatDateLabel(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = monthLabels[d.getMonth()];
  const yy = d.getFullYear();
  return `${dd} ${mm} ${yy}`;
}

function getInitials(name?: string) {
  const s = (name || "").trim();
  if (!s) return "SZ";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function prettyRole(role?: string) {
  const r = (role || "").toLowerCase();
  if (!r) return "Admin";
  if (r.includes("admin")) return "Admin";
  if (r.includes("user")) return "User";
  return role ?? "Admin";
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

function pctDiff(current: number, prev: number) {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0;
  if (prev <= 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}


// ===============================
// Helpers: Tipo incidente (robusto)
// ===============================
function canonTipo(raw: unknown): string {
  // "SOS-VIOLENCIA", "sos violencia", " SOS_VIOLENCIA " => "SOS_VIOLENCIA"
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_");
}

function getIncidenteTipoRaw(inc: any): string {
  // ✅ backend: tipo
  // fallback IA: aiCategoria
  return String(inc?.tipo ?? inc?.aiCategoria ?? "SIN_TIPO");
}

function prettyTipo(canon: string): string {
  return canon
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ===============================
   Animations
================================ */
const pageIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: "easeOut" } },
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.34, ease: [0.2, 0.8, 0.2, 1] },
  },
};

const gridStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const rowIn: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const ACCENT = "#fe5554";

/* ===============================
   Component
================================ */
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [incidentes, setIncidentes] = useState<IncidenteResponseDTO[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [me, setMe] = useState<SessionUser>(() => getSessionUser());
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // filtros
  const [range, setRange] = useState<RangeKey>("hoy");
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("14d");

  // filtro por tipo (heatmap)
  const [tipoFiltro, setTipoFiltro] = useState<string>("ALL");
  const [tipoMenuOpen, setTipoMenuOpen] = useState(false);
  const tipoMenuRef = useRef<HTMLDivElement | null>(null);

  // sidebar responsive
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ===============================
     Carga
  ================================ */
  async function cargarDashboard() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [{ incidentes, kpis }, usuariosList] = await Promise.all([
        dashboardService.cargar(),
        usuariosService.listar(),
      ]);
      setIncidentes(incidentes || []);
      setKpis(kpis || null);
      setUsuarios(usuariosList || []);
      setMe(getSessionUser());
    } catch (e: any) {
      console.error("Error cargando dashboard:", e);
      setErrorMsg(e?.message || "No se pudo cargar el dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  /* ===============================
     NAV + buscador
  ================================ */
  const NAV_ITEMS: NavItem[] = useMemo(
    () => [
      {
        label: "Panel",
        path: "/dashboard",
        keywords: ["panel", "dashboard", "inicio", "home"],
      },
      {
        label: "Comunidades",
        path: "/comunidades",
        keywords: ["comunidades", "comunidad", "community", "comu"],
      },
      {
        label: "Usuarios",
        path: "/usuarios",
        keywords: ["usuarios", "usuario", "user", "users"],
      },
      {
        label: "IA Análisis",
        path: "/analisis",
        keywords: ["ia", "análisis", "analisis", "ai", "inteligencia"],
      },
      {
        label: "Reportes",
        path: "/reportes",
        keywords: ["reportes", "reporte", "incidentes", "alerts", "alertas"],
      },
      {
        label: "Ajustes",
        path: "/codigo-acceso",
        keywords: [
          "ajustes",
          "config",
          "configuración",
          "configuracion",
          "codigo",
          "acceso",
        ],
      },
    ],
    []
  );

  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedQuery = useMemo(
    () => searchText.trim().toLowerCase(),
    [searchText]
  );

  const results = useMemo(() => {
    const q = normalizedQuery;
    if (!q) return [];
    const startsWith = (text: string) =>
      text.toLowerCase().trim().startsWith(q);
    return NAV_ITEMS.filter(
      (item) => startsWith(item.label) || item.keywords.some(startsWith)
    ).slice(0, 6);
  }, [NAV_ITEMS, normalizedQuery]);

  function goTo(path: string) {
    if (location.pathname !== path) navigate(path);
    setSearchOpen(false);
    setSearchText("");
    setSelectedIdx(0);
    setSidebarOpen(false);
  }

  // cerrar al click fuera
  useEffect(() => {
    if (!searchOpen) return;
    function onDown(e: MouseEvent) {
      const el = searchWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setSearchOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  useEffect(() => setSelectedIdx(0), [normalizedQuery]);

  // cerrar sidebar con ESC
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!tipoMenuOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = tipoMenuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setTipoMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTipoMenuOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [tipoMenuOpen]);

  // cerrar dropdown tipo al click fuera + ESC
  useEffect(() => {
    if (!tipoMenuOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = tipoMenuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setTipoMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTipoMenuOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [tipoMenuOpen]);

  useEffect(() => {
    setTipoFiltro("ALL");
    setTipoMenuOpen(false);
  }, [range]);

  /* ===============================
     Heatmap filter (tiempo real)
  ================================ */
  const incidentesFiltrados = useMemo(() => {
    if (!incidentes?.length) return [];
    const now = new Date();

    if (range === "hoy") {
      const start = startOfDayLocal(now).getTime();
      const end = endOfDayLocal(now).getTime();
      return incidentes.filter((i: any) => {
        const d = parseDateSafe(i.fechaCreacion);
        if (!d) return false;
        const t = d.getTime();
        return t >= start && t <= end;
      });
    }

    if (range === "7d") {
      const start = startOfDayLocal(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      ).getTime();
      const end = endOfDayLocal(now).getTime();
      return incidentes.filter((i: any) => {
        const d = parseDateSafe(i.fechaCreacion);
        if (!d) return false;
        const t = d.getTime();
        return t >= start && t <= end;
      });
    }

    const start = startOfDayLocal(
      new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
    ).getTime();
    const end = endOfDayLocal(now).getTime();
    return incidentes.filter((i: any) => {
      const d = parseDateSafe(i.fechaCreacion);
      if (!d) return false;
      const t = d.getTime();
      return t >= start && t <= end;
    });
  }, [incidentes, range]);

  const baseRango = useMemo(
    () => (incidentesFiltrados as any[]) || [],
    [incidentesFiltrados]
  );

  const baseMapeable = useMemo(() => {
    return baseRango.filter((inc) => {
      const lat = Number(inc?.lat);
      const lng = Number(inc?.lng);
      // válido + evita (0,0)
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)
      );
    });
  }, [baseRango]);

  const countTotalByTipo = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of baseRango) {
      const t = canonTipo(getIncidenteTipoRaw(inc));
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [baseRango]);
  // Tipos disponibles (según el rango seleccionado)
  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const inc of baseRango) set.add(canonTipo(getIncidenteTipoRaw(inc)));

    // ✅ ordena por "Total" desc (más útil para admin)
    return [...set]
      .filter((x) => !!x)
      .sort(
        (a, b) =>
          (countTotalByTipo.get(b) ?? 0) - (countTotalByTipo.get(a) ?? 0)
      );
  }, [baseRango, countTotalByTipo]);

  const countMapaByTipo = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of baseMapeable) {
      const t = canonTipo(getIncidenteTipoRaw(inc));
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [baseMapeable]);

  const incidentesHeatmapFinal = useMemo(() => {
    if (!baseMapeable.length) return [];

    if (tipoFiltro === "ALL") return baseMapeable;

    const wanted = canonTipo(tipoFiltro);
    return baseMapeable.filter(
      (inc) => canonTipo(getIncidenteTipoRaw(inc)) === wanted
    );
  }, [baseMapeable, tipoFiltro]);

  /* ===============================
     Analytics time series (Current vs Previous)
  ================================ */
  const analyticsDays = useMemo(() => {
    if (analyticsRange === "14d") return 14;
    if (analyticsRange === "1m") return 30;
    return 90;
  }, [analyticsRange]);

  const {
    series,
    currentTotal,
    previousTotal,
    windowStart,
    windowEnd,
    prevStart,
    prevEnd,
  } = useMemo(() => {
    const now = new Date();
    const end = endOfDayLocal(now);
    const start = startOfDayLocal(
      new Date(now.getTime() - (analyticsDays - 1) * 24 * 60 * 60 * 1000)
    );

    const prevEnd = endOfDayLocal(
      new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000)
    );
    const prevStart = startOfDayLocal(
      new Date(prevEnd.getTime() - (analyticsDays - 1) * 24 * 60 * 60 * 1000)
    );

    const dayCounts = (from: Date, to: Date) => {
      const buckets = new Map<string, number>();
      const cur = new Date(from);
      while (cur.getTime() <= to.getTime()) {
        buckets.set(startOfDayLocal(cur).toISOString(), 0);
        cur.setDate(cur.getDate() + 1);
      }

      for (const inc of incidentes as any[]) {
        const d = parseDateSafe(
          inc.fechaCreacion ?? inc.createdAt ?? inc.created_at
        );
        if (!d) continue;
        const t = d.getTime();
        if (t < from.getTime() || t > to.getTime()) continue;
        const key = startOfDayLocal(d).toISOString();
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }

      const entries = [...buckets.entries()].sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
      );
      return entries.map(([iso, value]) => ({ iso, value }));
    };

    const curArr = dayCounts(start, end);
    const prevArr = dayCounts(prevStart, prevEnd);

    const data = curArr.map((d, idx) => {
      const dateObj = new Date(d.iso);
      const prevVal = prevArr[idx]?.value ?? 0;
      return {
        label: formatDateLabel(dateObj), // día mes año
        iso: d.iso,
        current: d.value,
        previous: prevVal,
      };
    });

    return {
      series: data,
      currentTotal: sum(curArr.map((x) => x.value)),
      previousTotal: sum(prevArr.map((x) => x.value)),
      windowStart: start,
      windowEnd: end,
      prevStart,
      prevEnd,
    };
  }, [incidentes, analyticsDays]);

  /* ===============================
     KPIs
  ================================ */
  const totalReportes = useMemo(
    () => kpis?.alertasTotales ?? incidentes.length ?? 0,
    [kpis, incidentes]
  );

  const reportesDeltaPct = useMemo(
    () => pctDiff(currentTotal, previousTotal),
    [currentTotal, previousTotal]
  );

  const usuariosWithTs = useMemo(() => {
    const arr = (usuarios || []).map((u: any) => {
      const dStr =
        u.fechaCreacion ??
        u.fechaRegistro ??
        u.createdAt ??
        u.created_at ??
        null;
      const d = dStr ? parseDateSafe(dStr) : null;
      return { ...u, _ts: d ? d.getTime() : 0 };
    });
    return arr;
  }, [usuarios]);

  const usersInWindow = useMemo(() => {
    const start = windowStart.getTime();
    const end = windowEnd.getTime();
    const prevS = prevStart.getTime();
    const prevE = prevEnd.getTime();

    let cur = 0;
    let prev = 0;
    for (const u of usuariosWithTs as any[]) {
      if (!u._ts) continue;
      if (u._ts >= start && u._ts <= end) cur += 1;
      if (u._ts >= prevS && u._ts <= prevE) prev += 1;
    }
    return { cur, prev };
  }, [usuariosWithTs, windowStart, windowEnd, prevStart, prevEnd]);

  const usersDeltaPct = useMemo(
    () => pctDiff(usersInWindow.cur, usersInWindow.prev),
    [usersInWindow]
  );

  /* ===============================
     Donut: reportes por comunidad (Top 5)
  ================================ */
  const donutColors = useMemo(
    () => ["#fe5554", "#f59e0b", "#22c55e", "#3b82f6", "#06b6d4"],
    []
  );

  const comunidadesStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidentes as any[]) {
      const name = (
        i.comunidadNombre ||
        i.comunidad ||
        "Sin comunidad"
      ).toString();
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    const arr = [...map.entries()].map(([comunidadNombre, total]) => ({
      comunidadNombre,
      total,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [incidentes]);

  const topComunidades = useMemo(
    () => comunidadesStats.slice(0, 5),
    [comunidadesStats]
  );

  const donutChartData = useMemo(
    () =>
      topComunidades.map((c, idx) => ({
        name: c.comunidadNombre,
        value: c.total,
        color: donutColors[idx % donutColors.length],
      })),
    [topComunidades, donutColors]
  );

  const totalPorTopComunidades = useMemo(
    () => topComunidades.reduce((s, c) => s + c.total, 0),
    [topComunidades]
  );

  const donutSeries = useMemo(
    () => donutChartData.map((d) => d.value),
    [donutChartData]
  );
  const donutLabels = useMemo(
    () => donutChartData.map((d) => d.name),
    [donutChartData]
  );
  const donutApexColors = useMemo(
    () => donutChartData.map((d) => d.color),
    [donutChartData]
  );

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        toolbar: { show: false },
        animations: { enabled: true },
        background: "transparent",
      },
      labels: donutLabels,
      colors: donutApexColors,
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) =>
            `${Math.round(val).toLocaleString()} reportes`,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
          },
          expandOnClick: true,
        },
      },
      states: {
        hover: { filter: { type: "lighten", value: 0.06 } },
        active: { filter: { type: "darken", value: 0.06 } },
      },
    }),
    [donutLabels, donutApexColors]
  );

  /* ===============================
     Top usuarios (por # reportes)
  ================================ */
  const incidentesPorUsuario = useMemo(() => {
    const map = new Map<any, number>();
    for (const i of incidentes as any[]) {
      const uid =
        i.usuarioId ??
        i.userId ??
        i.usuario_id ??
        i.user_id ??
        i.creadoPorId ??
        null;
      if (!uid) continue;
      map.set(uid, (map.get(uid) ?? 0) + 1);
    }
    return map;
  }, [incidentes]);

  const topUsers = useMemo(() => {
    const rows: Array<{
      id: any;
      name: string;
      email: string;
      avatar?: string | null;
      count: number;
    }> = [];

    incidentesPorUsuario.forEach((count, uid) => {
      const u = (usuarios || []).find(
        (x: any) => (x?.id ?? x?.usuarioId ?? x?.userId) === uid
      );
      const name =
        u?.nombre ??
        u?.fullName ??
        `${u?.nombres ?? ""} ${u?.apellidos ?? ""}`.trim() ??
        `Usuario ${uid}`;
      const email = u?.email ?? "";
      const avatar = u?.fotoUrl ?? u?.foto ?? u?.photoURL ?? null;
      rows.push({
        id: uid,
        name: String(name || `Usuario ${uid}`),
        email: String(email || ""),
        avatar,
        count,
      });
    });

    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 8);
  }, [usuarios, incidentesPorUsuario]);

  const maxTopUser = useMemo(() => {
    let m = 0;
    for (const u of topUsers) m = Math.max(m, u.count);
    return m || 1;
  }, [topUsers]);

  const totalTipoRango = useMemo(() => {
    if (tipoFiltro === "ALL") return baseRango.length;
    const wanted = canonTipo(tipoFiltro);
    return baseRango.filter((i) => canonTipo(getIncidenteTipoRaw(i)) === wanted)
      .length;
  }, [baseRango, tipoFiltro]);

  const totalTipoMapeable = incidentesHeatmapFinal.length;

  return (
    <>
      <div className="background" />

      {/* overlay para móvil */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <motion.div
        className={`dashboard ${sidebarOpen ? "sidebar-open" : ""}`}
        initial="hidden"
        animate="show"
        variants={pageIn}
      >
        {/* ========== SIDEBAR ========== */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          closeSidebar={() => setSidebarOpen(false)}
          showCloseButton
        />

        {/* ========== MAIN ========== */}
        <main className="dashboard-main">
          {/* TOPBAR */}
          <div className="topbar">
            <button
              type="button"
              className="hamburger"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>

            <motion.div
              className="topbar-shell"
              initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="topbar-left">
                {/*<button type="button" className="topbar-back" aria-label="Volver" onClick={() => navigate(-1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 5L9 12L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>*/}

                <div
                  className={`search-pill-v2 ${searchOpen ? "open" : ""}`}
                  ref={searchWrapRef}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 0);
                  }}
                  role="search"
                >
                  <span className="search-ico-v2" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M16.5 16.5 21 21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <input
                    ref={searchInputRef}
                    className="search-input-v2"
                    value={searchText}
                    placeholder="Search..."
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => setSearchText(e.target.value.slice(0, 60))}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchOpen(false);
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedIdx((v) =>
                          Math.min(v + 1, Math.max(0, results.length - 1))
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedIdx((v) => Math.max(v - 1, 0));
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (results.length > 0) {
                          const pick =
                            results[Math.min(selectedIdx, results.length - 1)];
                          goTo(pick.path);
                        }
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="search-clear-v2"
                    aria-label="Limpiar"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchText("");
                      setSelectedIdx(0);
                      searchInputRef.current?.focus();
                    }}
                    style={{ opacity: searchText.trim() ? 1 : 0 }}
                  >
                    ✕
                  </button>

                  <AnimatePresence>
                    {searchOpen && searchText.trim() && (
                      <motion.div
                        className="search-dropdown-v2"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        role="listbox"
                      >
                        {results.length > 0 ? (
                          results.map((r, idx) => (
                            <button
                              key={r.path}
                              type="button"
                              className={`search-item-v2 ${
                                idx === selectedIdx ? "active" : ""
                              }`}
                              onMouseEnter={() => setSelectedIdx(idx)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goTo(r.path)}
                            >
                              <span className="search-item-label-v2">
                                {r.label}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="search-empty-v2">
                            No se encontraron coincidencias.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ✅ TOP RIGHT: solo ES + Admin + avatar (sin otros iconos) */}
              <div className="topbar-actions">
                <div className="me-pill-v2" title={me?.email ?? ""}>
                  <div className="me-role-pill-v2">
                    <ShieldCheck size={16} />
                    <span>{prettyRole(me?.rol)}</span>
                  </div>

                  <div className="me-v2">
                    {me?.fotoUrl ? (
                      <img
                        className="me-avatar-v2"
                        src={me.fotoUrl}
                        alt="Usuario"
                      />
                    ) : (
                      <div className="me-avatar-v2 me-fallback-v2">
                        {getInitials(me?.nombre)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {errorMsg && (
            <div className="top-error">
              <div className="top-error-row">
                <span>{errorMsg}</span>
                <button className="pill pill-outline" onClick={cargarDashboard}>
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* ======= CONTENIDO ======= */}
          <section className="content-wrap">
            {/* Header Analytics + chips */}
            <motion.div
              className="card analytics-header-v2"
              variants={cardIn}
              initial="hidden"
              animate="show"
            >
              <div className="analytics-head-left">
                <div className="analytics-title-v2">Analytics</div>
              </div>
              <div className="analytics-filters-v2">
                <button
                  type="button"
                  className={`analytics-chip-v2 ${
                    analyticsRange === "14d" ? "active" : ""
                  }`}
                  onClick={() => setAnalyticsRange("14d")}
                >
                  14 Days
                </button>
                <button
                  type="button"
                  className={`analytics-chip-v2 ${
                    analyticsRange === "1m" ? "active" : ""
                  }`}
                  onClick={() => setAnalyticsRange("1m")}
                >
                  1 Month
                </button>
                <button
                  type="button"
                  className={`analytics-chip-v2 ${
                    analyticsRange === "3m" ? "active" : ""
                  }`}
                  onClick={() => setAnalyticsRange("3m")}
                >
                  3 Month
                </button>
              </div>
            </motion.div>

            {/* KPI row */}
            <motion.div
              className="kpi-row-v2"
              variants={gridStagger}
              initial="hidden"
              animate="show"
            >
              <motion.article className="card kpi-card-v2" variants={cardIn}>
                <div className="kpi-top">
                  <div className="kpi-title-v2">Reportes</div>
                  <div
                    className={`kpi-pct ${
                      reportesDeltaPct >= 0 ? "up" : "down"
                    }`}
                  >{`${Math.abs(reportesDeltaPct).toFixed(2)}%`}</div>
                </div>

                <div className="kpi-mid">
                  <div className="kpi-icon kpi-icon--accent">
                    <BarChart3 size={24} />
                  </div>
                  <div className="kpi-value-v2">
                    {isLoading ? "…" : totalReportes.toLocaleString()}
                  </div>
                </div>

                <div className="kpi-sub-v2">
                  <span className="kpi-dot-v2" />
                  <span>
                    {isLoading ? "—" : `Comparado al periodo anterior`}
                  </span>
                </div>
              </motion.article>

              <motion.article className="card kpi-card-v2" variants={cardIn}>
                <div className="kpi-top">
                  <div className="kpi-title-v2">Usuarios</div>
                  <div
                    className={`kpi-pct ${usersDeltaPct >= 0 ? "up" : "down"}`}
                  >{`${Math.abs(usersDeltaPct).toFixed(2)}%`}</div>
                </div>

                <div className="kpi-mid">
                  <div className="kpi-icon kpi-icon--soft">
                    <Users size={24} />
                  </div>
                  <div className="kpi-value-v2">
                    {isLoading ? "…" : (usuarios?.length ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="kpi-sub-v2">
                  <span className="kpi-dot-v2" />
                  <span>
                    {isLoading
                      ? "—"
                      : `${(
                          kpis?.usuariosActivos ?? 0
                        ).toLocaleString()} activos`}
                  </span>
                </div>
              </motion.article>

              <motion.article className="card kpi-card-v2" variants={cardIn}>
                <div className="kpi-top">
                  <div className="kpi-title-v2">Comunidades</div>
                  <div className="kpi-pct up">{`—`}</div>
                </div>

                <div className="kpi-mid">
                  <div className="kpi-icon kpi-icon--soft">
                    <MapPin size={24} />
                  </div>
                  <div className="kpi-value-v2">
                    {isLoading ? "…" : comunidadesStats.length.toLocaleString()}
                  </div>
                </div>

                <div className="kpi-sub-v2">
                  <span className="kpi-dot-v2" />
                  <span>
                    {isLoading
                      ? "—"
                      : `${topComunidades.length} top (histórico)`}
                  </span>
                </div>
              </motion.article>

              <motion.article className="card kpi-cta-v2" variants={cardIn}>
                <div className="cta-title">Ver incidentes</div>
                <div className="cta-sub">
                  Accede al listado completo de reportes y filtra por estado,
                  comunidad o severidad.
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="cta-btn"
                  onClick={() => navigate("/reportes")}
                >
                  Ir a incidentes →
                </motion.button>
              </motion.article>
            </motion.div>

            {/* Row: Line chart + Donut */}
            <div className="grid-2col">
              <motion.article
                className="card chart-card-v2"
                variants={cardIn}
                initial="hidden"
                animate="show"
              >
                <div className="chart-head">
                  <div>
                    <div className="chart-title-v2">Reportes por fecha</div>
                    <div className="chart-sub-v2">
                      {analyticsRange === "14d"
                        ? "Últimos 14 días"
                        : analyticsRange === "1m"
                        ? "Últimos 30 días"
                        : "Últimos 90 días"}
                      {" · "}
                      {formatDateLabel(windowStart)} –{" "}
                      {formatDateLabel(windowEnd)}
                    </div>
                  </div>

                  <div className="legend-mini">
                    <span className="leg">
                      <span className="dot accent" />
                      Current
                    </span>
                    <span className="leg">
                      <span className="dot neutral" />
                      Previous
                    </span>
                  </div>
                </div>

                {/*más alta para ocupar el espacio */}
                <div className="chart-wrap-v2 chart-wrap-v2--tall">
                  <ResponsiveContainer width="100%" height={420}>
                    <AreaChart
                      data={series}
                      margin={{ top: 12, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="gCurrent"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={ACCENT}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={ACCENT}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                        <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#64748b"
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="100%"
                            stopColor="#64748b"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>

                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        width={36}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.78)",
                          background: "rgba(255,255,255,0.92)",
                          boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
                        }}
                        labelStyle={{ fontWeight: 900, color: "#0f172a" }}
                        formatter={(v: any, name: any) => [
                          v,
                          name === "current" ? "Current" : "Previous",
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="previous"
                        stroke="#64748b"
                        strokeWidth={2}
                        fill="url(#gPrev)"
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive
                      />

                      <Area
                        type="monotone"
                        dataKey="current"
                        stroke={ACCENT}
                        strokeWidth={2}
                        fill="url(#gCurrent)"
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.article>

              {/* ✅ Donut sin “cuadro/fondo” interno y ocupando espacio */}
              <motion.article
                className="card donut-card-v2"
                variants={cardIn}
                initial="hidden"
                animate="show"
              >
                <div className="chart-title-v2">Reportes por comunidad</div>
                <div className="chart-sub-v2">
                  Distribución de incidentes por comunidad (top 5).
                </div>

                <div className="donut-stack-v2">
                  <div className="donut-apex-shell">
                    {donutSeries.length > 0 ? (
                      <>
                        <Chart
                          options={donutOptions}
                          series={donutSeries}
                          type="donut"
                          height={320}
                        />
                        <div className="donut-center-v2">
                          <div className="donut-total-v2">
                            {totalPorTopComunidades.toLocaleString()}
                          </div>
                          <div className="donut-label-v2">Reportes</div>
                        </div>
                      </>
                    ) : (
                      <div className="donut-empty">Aún no hay datos.</div>
                    )}
                  </div>

                  <div className="donut-legend-grid-v2">
                    {donutChartData.map((c, idx) => (
                      <motion.div
                        key={c.name}
                        className="donut-li-v2"
                        variants={rowIn}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: idx * 0.03 }}
                      >
                        <span
                          className="donut-dot-v2"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="donut-name-v2" title={c.name}>
                          {c.name}
                        </span>
                        <span className="donut-val-v2">{c.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.article>
            </div>

            {/* Row: Heatmap + Top usuarios */}
            <div className="grid-2col heat-row">
              <motion.article
                className="card heat-card-v2"
                variants={cardIn}
                initial="hidden"
                animate="show"
              >
                <div className="card-head-v2">
                  <div>
                    <div className="card-title-v2">Mapa de calor</div>
                    <div className="card-sub-v2">
                      Zonas con mayor concentración de emergencias
                    </div>
                  </div>

                  <div className="tabs-v2">
                    <button
                      type="button"
                      className={`tab-v2 ${range === "hoy" ? "active" : ""}`}
                      onClick={() => setRange("hoy")}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      className={`tab-v2 ${range === "7d" ? "active" : ""}`}
                      onClick={() => setRange("7d")}
                    >
                      Últimos 7 días
                    </button>
                    <button
                      type="button"
                      className={`tab-v2 ${range === "30d" ? "active" : ""}`}
                      onClick={() => setRange("30d")}
                    >
                      30 días
                    </button>
                    <div className="typefilter-v2" ref={tipoMenuRef}>
                      <button
                        type="button"
                        className={`tab-v2 type-btn-v2 ${
                          tipoFiltro !== "ALL" ? "active" : ""
                        }`}
                        onClick={() => setTipoMenuOpen((v) => !v)}
                        aria-haspopup="listbox"
                        aria-expanded={tipoMenuOpen}
                        title="Filtrar por tipo de incidente"
                      >
                        Tipo
                        <span className="type-pill-v2">
                          {tipoFiltro === "ALL" ? "Todos" : tipoFiltro}
                        </span>
                        <span className={`chev-v2 ${tipoMenuOpen ? "up" : ""}`}>
                          ▾
                        </span>
                      </button>

                      <AnimatePresence>
                        {tipoMenuOpen && (
                          <motion.div
                            className="type-menu-v2"
                            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            role="listbox"
                          >
                            <button
                              type="button"
                              className={`type-item-v2 ${
                                tipoFiltro === "ALL" ? "active" : ""
                              }`}
                              onClick={() => {
                                setTipoFiltro("ALL");
                                setTipoMenuOpen(false);
                              }}
                            >
                              <span className="type-name-v2">Todos</span>
                              <span className="type-count-v2">
                                {(
                                  incidentesFiltrados?.length ?? 0
                                ).toLocaleString()}
                              </span>
                             </button>

                             <div className="type-sep-v2" />

                             {tiposDisponibles.map((t) => {
                              const total = countTotalByTipo.get(t) ?? 0;
                              const enMapa = countMapaByTipo.get(t) ?? 0;
                              const sinUb = Math.max(0, total - enMapa);

                              return (
                                <button
                                  key={t}
                                  type="button"
                                  className={`type-item-v2 ${
                                    canonTipo(tipoFiltro) === t ? "active" : ""
                                  }`}
                                  onClick={() => {
                                    setTipoFiltro(t);
                                    setTipoMenuOpen(false);
                                  }}
                                  title={t}
                                >
                                  <span className="type-name-v2">
                                    {prettyTipo(t)}
                                  </span>

                                  <span className="type-badges-v2">
                                    <span className="type-badge-v2">
                                      Total {total}
                                    </span>

                                    <span
                                      className={`type-badge-v2 ${
                                        enMapa === 0 ? "zero" : ""
                                      }`}
                                    >
                                      Mapa {enMapa}
                                    </span>

                                    {sinUb > 0 && (
                                      <span className="type-badge-v2 warn">
                                        Sin ub. {sinUb}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}

                            {tiposDisponibles.length === 0 && (
                              <div className="type-empty-v2">
                                No hay tipos disponibles.
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="heat-wrap-v2">
                  {totalTipoRango > 0 && totalTipoMapeable === 0 && (
                    <div className="heatmap-empty-info">
                      ⚠️ Hay reportes del tipo seleccionado, pero ninguno tiene
                      ubicación registrada.
                    </div>
                  )}

                  <IncidentHeatmap incidentes={incidentesHeatmapFinal} />
                </div>
              </motion.article>

              <motion.article
                className="card topusers-card-v2"
                variants={cardIn}
                initial="hidden"
                animate="show"
              >
                <div className="chart-title-v2">Top usuarios</div>
                <div className="chart-sub-v2">
                  Usuarios con más reportes registrados.
                </div>

                <div className="users-list-v2">
                  {topUsers.map((u, idx) => {
                    const pct = (u.count / maxTopUser) * 100;
                    const isTop = idx < 3;
                    return (
                      <motion.div
                        key={String(u.id)}
                        className="user-row-v2"
                        variants={rowIn}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ y: -1 }}
                      >
                        <div className={`user-rank-v2 ${isTop ? "top" : ""}`}>
                          {idx + 1}
                        </div>

                        {u.avatar ? (
                          <img
                            className="user-avatar-v2"
                            src={u.avatar}
                            alt={u.name}
                          />
                        ) : (
                          <div className="user-avatar-v2 fallback">
                            {getInitials(u.name)}
                          </div>
                        )}

                        <div className="user-main-v2">
                          <div className="user-name-v2">{u.name}</div>
                          <div className="user-email-v2">{u.email}</div>

                          <div className="user-bar-wrap-v2">
                            <motion.div
                              className="user-bar-v2"
                              initial={{ width: "0%" }}
                              animate={{ width: `${clamp(pct, 4, 100)}%` }}
                              transition={{
                                duration: 0.55,
                                ease: [0.2, 0.8, 0.2, 1],
                              }}
                            />
                          </div>
                        </div>

                        <div className="user-count-v2">{u.count}</div>
                      </motion.div>
                    );
                  })}

                  {!isLoading && topUsers.length === 0 && (
                    <div className="empty-v2">
                      Aún no hay datos para Top usuarios.
                    </div>
                  )}
                </div>
              </motion.article>
            </div>
          </section>
        </main>
      </motion.div>
    </>
  );
}
