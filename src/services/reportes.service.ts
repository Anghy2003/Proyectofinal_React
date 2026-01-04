// src/services/reportesService.ts
import { apiClient } from "./apiClient";
import type { IncidenteResponseDTO } from "./incidentesService";

export type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

export type Reporte = {
  id: string;
  usuario: string;

  // ✅ FOTO ORIGINAL del usuario (viene del backend)
  // (URL de Cloudinary / Firebase / tu backend)
  usuarioFotoUrl?: string | null;

  tipo: string;
  comunidad: string;
  fecha: string; // dd/mm/yyyy
  ubicacion: string;
  estado: EstadoReporte;
};

type IncidenteExtras = {
  // Coloca aquí los nombres más comunes que podría traerte tu API
  usuarioFotoUrl?: string | null;
  usuarioFoto?: string | null;
  usuarioAvatarUrl?: string | null;
  fotoUrl?: string | null;
  avatarUrl?: string | null;
  usuarioFotoPerfil?: string | null;
};

type IncidenteReporteDTO = IncidenteResponseDTO & IncidenteExtras;

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

function pickUsuarioFoto(i: IncidenteReporteDTO): string | null {
  // ✅ Prioridad a "usuarioFotoUrl" (lo que tú dices que ya viene)
  return (
    i.usuarioFotoUrl ??
    i.usuarioFoto ??
    i.usuarioAvatarUrl ??
    i.usuarioFotoPerfil ??
    i.fotoUrl ??
    i.avatarUrl ??
    null
  );
}

function mapIncidenteToReporte(i: IncidenteReporteDTO): Reporte {
  return {
    id: String(i.id),
    usuario: i.usuarioNombre || "Usuario",

    // ✅ Foto original
    usuarioFotoUrl: pickUsuarioFoto(i),

    tipo: i.tipo || "Sin tipo",
    comunidad: i.comunidadNombre || "Sin comunidad",
    fecha: isoToDDMMYYYY(i.fechaCreacion),
    ubicacion:
      typeof (i as any).lat === "number" && typeof (i as any).lng === "number"
        ? `(${(i as any).lat.toFixed(5)}, ${(i as any).lng.toFixed(5)})`
        : "Sin ubicación",
    estado: normalizarEstado(i.estado),
  };
}

export const reportesService = {
  // GET /api/incidentes
  async listar(): Promise<Reporte[]> {
    const data = await apiClient.get<IncidenteReporteDTO[]>("/incidentes");
    return data.map(mapIncidenteToReporte);
  },

  // DELETE /api/incidentes/{id}
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
