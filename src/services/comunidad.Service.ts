// src/services/comunidad.Service.ts

const BASE_URL = "http://localhost:8080/api";

// 👇 Estados tal como en el enum del backend
export type EstadoComunidad = "SOLICITADA" | "ACTIVA" | "RECHAZADA";

// ✅ Type alineado a ComunidadDTO (con campos nuevos)
export type Comunidad = {
  id: number;
  nombre: string;
  direccion?: string | null;

  codigoAcceso: string | null;
  estado: EstadoComunidad;
  fechaCreacion: string; // ISO

  activa?: boolean | null;
  miembrosCount?: number | null;

  // ✅ nuevos
  fotoUrl?: string | null;
  centroLat?: number | null;
  centroLng?: number | null;
  radioKm?: number | null; // si backend manda BigDecimal -> llega number
};

// ===================== GET TODAS =====================
export async function getTodasComunidades(): Promise<Comunidad[]> {
  const resp = await fetch(`${BASE_URL}/comunidades`);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Error getTodasComunidades:", txt);
    throw new Error("No se pudieron cargar las comunidades");
  }

  return resp.json();
}

// ===================== APROBAR (genera código + SMS en backend) =====================
export async function aprobarComunidadApi(id: number): Promise<Comunidad> {
  const resp = await fetch(`${BASE_URL}/comunidades/${id}/aprobar`, {
    method: "POST",
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Error aprobarComunidadApi:", txt);
    throw new Error("No se pudo aprobar la comunidad");
  }

  return resp.json();
}
