// ===============================
// src/services/comunidad.Service.ts
// ===============================
import { apiClient } from "./apiClient";

// ✅ Agregamos SUSPENDIDA para alinear con backend
export type EstadoComunidad = "SOLICITADA" | "ACTIVA" | "RECHAZADA" | "SUSPENDIDA";

export type Comunidad = {
  id: number;
  nombre: string;
  direccion?: string | null;

  codigoAcceso: string | null;
  fotoUrl?: string | null;

  // ⚠️ En backend es Point centroGeografico, NO mandamos lat/lng en update
  centroLat?: number | null;
  centroLng?: number | null;

  radioKm?: number | null; // backend BigDecimal
  activa?: boolean | null;
  fechaCreacion?: string; // backend OffsetDateTime
  estado: EstadoComunidad;

  miembrosCount?: number | null; // backend @Transient
  solicitadaPorUsuarioId?: number | null;
};

type ComunidadUpdatePayload = {
  id: number;
  nombre: string;
  direccion: string | null;
  codigoAcceso: string | null;
  fotoUrl: string | null;
  radioKm: number | null;
  activa: boolean | null;
  estado: EstadoComunidad;
  solicitadaPorUsuarioId: number | null;

  fechaCreacion: string | null; // ✅ conservar
};

export const comunidadesService = {
  listar: async (): Promise<Comunidad[]> => {
    return apiClient.get<Comunidad[]>("/comunidades");
  },

  obtener: async (id: number): Promise<Comunidad> => {
    return apiClient.get<Comunidad>(`/comunidades/${id}`);
  },

  // ✅ Backend real: POST /api/comunidades/{id}/aprobar/usuario/{usuarioId}
  aprobar: async (id: number, usuarioId: number): Promise<Comunidad> => {
    return apiClient.post<Comunidad>(`/comunidades/${id}/aprobar/usuario/${usuarioId}`);
  },

  // ✅ PUT /api/comunidades/{id}/usuario/{usuarioId}
  actualizar: async (
    id: number,
    usuarioId: number,
    payload: ComunidadUpdatePayload
  ): Promise<Comunidad> => {
    return apiClient.put<Comunidad>(`/comunidades/${id}/usuario/${usuarioId}`, payload);
  },

  // ✅ NUEVO: POST /api/comunidades/{id}/suspender/usuario/{usuarioId}
  suspender: async (id: number, usuarioId: number): Promise<void> => {
    await apiClient.post(`/comunidades/${id}/suspender/usuario/${usuarioId}`);
  },
};
