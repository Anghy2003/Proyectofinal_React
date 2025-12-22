// src/services/reportesService.ts
import { apiClient } from "./apiClient";
import type { IncidenteResponseDTO } from "./incidentesService";

export type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

export type Reporte = {
  id: string;
  usuario: string;
  tipo: string;
  comunidad: string;
  fecha: string; // dd/mm/yyyy
  ubicacion: string;
  estado: EstadoReporte;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToDDMMYYYY(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function normalizarEstado(estadoApi?: string | null): EstadoReporte {
  const e = (estadoApi || "").toLowerCase();

  if (e === "resuelto" || e === "atendido") return "Atendido";
  if (e === "falso" || e === "falso_positivo") return "Falso positivo";
  return "Pendiente";
}

function mapIncidenteToReporte(i: IncidenteResponseDTO): Reporte {
  return {
    id: String(i.id),
    usuario: i.usuarioNombre || "Usuario",
    tipo: i.tipo || "Sin tipo",
    comunidad: i.comunidadNombre || "Sin comunidad",
    fecha: isoToDDMMYYYY(i.fechaCreacion),
    ubicacion:
      typeof i.lat === "number" && typeof i.lng === "number"
        ? `(${i.lat.toFixed(5)}, ${i.lng.toFixed(5)})`
        : "Sin ubicación",
    estado: normalizarEstado(i.estado),
  };
}

export const reportesService = {
  // GET /api/incidentes
  async listar(): Promise<Reporte[]> {
    const data = await apiClient.get<IncidenteResponseDTO[]>("/incidentes");
    return data.map(mapIncidenteToReporte);
  },

  // DELETE /api/incidentes/{id}  (solo si tu backend lo tiene)
  async eliminar(id: string | number): Promise<void> {
    await apiClient.del<void>(`/incidentes/${id}`);
  },

  // PUT /api/incidentes/{id}/estado?estado=...&moderadorId=...
  async cambiarEstado(
    id: string | number,
    estado: "pendiente" | "resuelto" | "falso_positivo",
    moderadorId?: number
  ): Promise<void> {
    await apiClient.putQ<void>(`/incidentes/${id}/estado`, {
      estado,
      moderadorId,
    });
  },
};
