// src/services/comunidadService.ts

const BASE_URL = "http://localhost:8080/api";

// 👇 Estados tal como en el enum del backend
export type EstadoComunidad = "SOLICITADA" | "ACTIVA" | "RECHAZADA";

export type Comunidad = {
  id: number;
  nombre: string;
  codigoAcceso: string | null;
  estado: EstadoComunidad;
  fechaCreacion: string; // ISO en texto

  // campos extra que vienen del backend (opcionales por si acaso)
  direccion?: string;
  activa?: boolean;
};

//
// 🔹 NUEVO: traer TODAS las comunidades (es el endpoint que sí tienes)
//   GET /api/comunidades
//
export async function getTodasComunidades(): Promise<Comunidad[]> {
  const resp = await fetch(`${BASE_URL}/comunidades`);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Error getTodasComunidades:", txt);
    throw new Error("No se pudieron cargar las comunidades");
  }

  return resp.json();
}

// (Si más adelante creas los endpoints por estado, puedes dejar esto comentado)
/*
export async function getComunidadesPorEstado(
  estado: EstadoComunidad
): Promise<Comunidad[]> {
  const resp = await fetch(`${BASE_URL}/comunidades/estado/${estado}`);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Error getComunidadesPorEstado:", txt);
    throw new Error("No se pudieron cargar las comunidades");
  }

  return resp.json();
}
*/

//
// Sigue sirviendo para la pantalla de Códigos si ya tienes este endpoint:
//
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
