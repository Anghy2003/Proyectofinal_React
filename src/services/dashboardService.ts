import { incidentesService, type IncidenteResponseDTO } from "./incidentesService";
import { usuariosService } from "./Usuario.Service";

function isSameDayUTC(iso: string, now = new Date()) {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export type DashboardKpis = {
  // Lo que usa tu UI:
  alertasTotales: number;
  alertasResueltas: number;
  alertasFalsasIA: number;
  criticas24h: number;

  // Lo que ya tenías:
  reportesHoy: number;
  falsosIA: number;
  slaPct: number;
  usuariosActivos: number;
  ultimasAlertas: IncidenteResponseDTO[];
  topComunidades7d: { comunidadNombre: string; reportes: number }[];

  // (opcional) para tu heroText:
  mejoraResolucionPct?: number;
};

export const dashboardService = {
  async cargar(): Promise<{ incidentes: IncidenteResponseDTO[]; kpis: DashboardKpis }> {
    const [incidentes, usuarios] = await Promise.all([
      incidentesService.listar(),
      usuariosService.listar(),
    ]);

    // Totales
    const alertasTotales = incidentes.length;

    // Resueltos
    const alertasResueltas = incidentes.filter(
      (i) => (i.estado || "").toLowerCase() === "resuelto" || !!i.fechaResolucion
    ).length;

    // Hoy (UTC)
    const reportesHoy = incidentes.filter(
      (i) => i.fechaCreacion && isSameDayUTC(i.fechaCreacion)
    ).length;

    // Falsos IA
    const falsosIA = incidentes.filter((i) => i.aiPosibleFalso === true).length;
    const alertasFalsasIA = falsosIA;

    // Usuarios activos
    const usuariosActivos = usuarios.filter((u: any) => u.activo !== false).length;

    // SLA (% resueltos del total)
    const total = incidentes.length || 1;
    const slaPct = Math.round((alertasResueltas / total) * 100);

    // Críticas 24h (heurística: prioridad/severidad/nivel)
    const now = new Date();
    const last24hMs = 24 * 60 * 60 * 1000;

    const criticas24h = incidentes.filter((i: any) => {
      const fc = i.fechaCreacion ? new Date(i.fechaCreacion).getTime() : 0;
      if (!fc) return false;
      if (now.getTime() - fc > last24hMs) return false;

      const p = String(
        i.prioridad ?? i.nivel ?? i.severidad ?? i.aiPrioridad ?? i.aiNivel ?? i.aiSeveridad ?? ""
      ).toLowerCase();

      return p.includes("crit") || p.includes("alta") || p.includes("high");
    }).length;

    // Últimas alertas (máx 6)
    const ultimasAlertas = [...incidentes]
      .filter((i) => i.fechaCreacion)
      .sort((a, b) => new Date(b.fechaCreacion!).getTime() - new Date(a.fechaCreacion!).getTime())
      .slice(0, 6);

    // Top comunidades últimos 7 días
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const last7d = incidentes.filter((i) => {
      if (!i.fechaCreacion) return false;
      return now.getTime() - new Date(i.fechaCreacion).getTime() <= sevenDaysMs;
    });

    const byComu = new Map<string, number>();
    for (const i of last7d) {
      const name = (i as any).comunidadNombre || "Sin comunidad";
      byComu.set(name, (byComu.get(name) ?? 0) + 1);
    }

    const topComunidades7d = [...byComu.entries()]
      .map(([comunidadNombre, reportes]) => ({ comunidadNombre, reportes }))
      .sort((a, b) => b.reportes - a.reportes)
      .slice(0, 5);

    return {
      incidentes,
      kpis: {
        alertasTotales,
        alertasResueltas,
        alertasFalsasIA,
        criticas24h,
        reportesHoy,
        falsosIA,
        slaPct,
        usuariosActivos,
        ultimasAlertas,
        topComunidades7d,
      },
    };
  },
};
