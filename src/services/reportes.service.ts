// src/services/reportes.service.ts

const BASE_URL = "http://localhost:8080/api";

// =====================
// TIPOS
// =====================
export type EstadoReporte = "Atendido" | "Pendiente" | "Falso positivo";

export type Reporte = {
  id: string;
  usuario: string;
  tipo: string;
  comunidad: string;
  fecha: string;      // dd/mm/yyyy
  ubicacion: string;
  estado: EstadoReporte;
};

// Lo que viene del backend (IncidenteResponseDTO)
export type IncidenteApi = {
  id: number;
  tipo?: string | null;
  estado?: string | null;
  fechaCreacion?: string | null;

  usuario?: {
    nombre?: string;
    name?: string;
    email?: string;
  } | null;

  comunidad?: {
    nombre?: string;
    name?: string;
  } | null;

  ubicacion?: any;
};

// =====================
// HELPERS
// =====================
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

function mapIncidenteToReporte(i: IncidenteApi): Reporte {
  return {
    id: String(i.id),
    usuario:
      i.usuario?.nombre ||
      i.usuario?.name ||
      i.usuario?.email ||
      "Usuario",

    tipo: i.tipo || "Sin tipo",

    comunidad:
      i.comunidad?.nombre ||
      i.comunidad?.name ||
      "Sin comunidad",

    fecha: isoToDDMMYYYY(i.fechaCreacion),

    ubicacion: i.ubicacion
      ? "Ubicación registrada"
      : "Sin ubicación",

    estado: normalizarEstado(i.estado),
  };
}

// =====================
// SERVICE
// =====================
export const reportesService = {
  // GET /api/incidentes
  async listar(): Promise<Reporte[]> {
    const resp = await fetch(`${BASE_URL}/incidentes`);

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Error listar reportes:", txt);
      throw new Error("No se pudieron cargar los reportes");
    }

    const data: IncidenteApi[] = await resp.json();
    return data.map(mapIncidenteToReporte);
  },

  // DELETE /api/incidentes/{id}
  async eliminar(id: string | number): Promise<void> {
    const resp = await fetch(`${BASE_URL}/incidentes/${id}`, {
      method: "DELETE",
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Error eliminar reporte:", txt);
      throw new Error("No se pudo eliminar el reporte");
    }
  },

  // PUT /api/incidentes/{id}/estado
  async cambiarEstado(
    id: string | number,
    estado: "pendiente" | "resuelto" | "falso_positivo",
    moderadorId?: number
  ): Promise<void> {
    const params = new URLSearchParams({ estado });

    if (moderadorId) {
      params.append("moderadorId", String(moderadorId));
    }

    const resp = await fetch(
      `${BASE_URL}/incidentes/${id}/estado?${params.toString()}`,
      { method: "PUT" }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Error cambiar estado:", txt);
      throw new Error("No se pudo cambiar el estado");
    }
  },
};
