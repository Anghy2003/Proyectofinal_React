// src/services/dashboardService.ts
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
  reportesHoy: number;
  falsosIA: number;
  slaPct: number;
  usuariosActivos: number;
  ultimasAlertas: IncidenteResponseDTO[];
  topComunidades7d: { comunidadNombre: string; reportes: number }[];
};

export const dashboardService = {
  async cargar(): Promise<{
    incidentes: IncidenteResponseDTO[];
    kpis: DashboardKpis;
  }> {
    const [incidentes, usuarios] = await Promise.all([
      incidentesService.listar(),
      usuariosService.listar(),
    ]);

    // Reportes hoy (por fechaCreacion UTC)
    const reportesHoy = incidentes.filter(
      (i) => i.fechaCreacion && isSameDayUTC(i.fechaCreacion)
    ).length;

    // Falsos positivos IA
    const falsosIA = incidentes.filter((i) => i.aiPosibleFalso === true).length;

    // Usuarios activos (si activo es boolean)
    const usuariosActivos = usuarios.filter((u) => u.activo !== false).length;

    // SLA heurístico: resueltos / total
    const total = incidentes.length || 1;
    const resueltos = incidentes.filter(
      (i) => (i.estado || "").toLowerCase() === "resuelto" || !!i.fechaResolucion
    ).length;
    const slaPct = Math.round((resueltos / total) * 100);

    // Últimas alertas (máx 6)
    const ultimasAlertas = [...incidentes]
      .filter((i) => i.fechaCreacion)
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion!).getTime() - new Date(a.fechaCreacion!).getTime()
      )
      .slice(0, 6);

    // Top comunidades últimos 7 días
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const last7d = incidentes.filter((i) => {
      if (!i.fechaCreacion) return false;
      return now.getTime() - new Date(i.fechaCreacion).getTime() <= sevenDaysMs;
    });

    const byComu = new Map<string, number>();
    for (const i of last7d) {
      const name = i.comunidadNombre || "Sin comunidad";
      byComu.set(name, (byComu.get(name) ?? 0) + 1);
    }

    const topComunidades7d = [...byComu.entries()]
      .map(([comunidadNombre, reportes]) => ({ comunidadNombre, reportes }))
      .sort((a, b) => b.reportes - a.reportes)
      .slice(0, 5);

    return {
      incidentes,
      kpis: {
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
