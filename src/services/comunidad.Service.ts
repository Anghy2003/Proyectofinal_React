// src/services/comunidad.Service.ts
import { apiClient } from "./apiClient";

export type EstadoComunidad = "SOLICITADA" | "ACTIVA" | "RECHAZADA";

export type Comunidad = {
  id: number;
  nombre: string;
  direccion?: string | null;

  codigoAcceso: string | null;
  estado: EstadoComunidad;
  fechaCreacion: string; // ISO

  activa?: boolean | null;
  miembrosCount?: number | null;

  fotoUrl?: string | null;
  centroLat?: number | null;
  centroLng?: number | null;
  radioKm?: number | null;

  solicitadaPorUsuarioId?: number | null;
};

export const comunidadesService = {
  listar: async (): Promise<Comunidad[]> => {
    return apiClient.get<Comunidad[]>("/comunidades");
  },

  obtener: async (id: number): Promise<Comunidad> => {
    return apiClient.get<Comunidad>(`/comunidades/${id}`);
  },

  aprobar: async (id: number): Promise<Comunidad> => {
    return apiClient.post<Comunidad>(`/comunidades/${id}/aprobar`);
  },
};
