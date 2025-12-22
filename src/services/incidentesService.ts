// src/services/incidentesService.ts
import { apiClient } from "./apiClient";

export type IncidenteResponseDTO = {
  id: number;
  tipo: string;
  descripcion?: string | null;

  lat?: number | null;
  lng?: number | null;

  imagenUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;

  nivelPrioridad?: "BAJA" | "MEDIA" | "ALTA" | string | null;
  estado?: string | null;

  usuarioId?: number | null;
  usuarioNombre?: string | null;
  usuarioFoto?: string | null;

  comunidadId?: number | null;
  comunidadNombre?: string | null;

  moderadoPorId?: number | null;
  moderadoPorNombre?: string | null;

  fechaCreacion?: string | null;
  fechaResolucion?: string | null;

  aiCategoria?: string | null;
  aiPrioridad?: string | null;
  aiConfianza?: number | null;
  aiPosibleFalso?: boolean | null;
  aiMotivos?: string | null;
  aiRiesgos?: string | null;
  aiAccionRecomendada?: string | null;
  aiAnalizadoEn?: string | null;
};

export const incidentesService = {
  listar: () => apiClient.get<IncidenteResponseDTO[]>("/incidentes"),
  obtener: (id: number) => apiClient.get<IncidenteResponseDTO>(`/incidentes/${id}`),

  // ✅ endpoint real (query params)
  cambiarEstado: (
    id: string | number,
    estado: "pendiente" | "resuelto" | "falso_positivo",
    moderadorId?: number
  ) =>
    apiClient.putQ<void>(`/incidentes/${id}/estado`, {
      estado,
      moderadorId,
    }),
};
