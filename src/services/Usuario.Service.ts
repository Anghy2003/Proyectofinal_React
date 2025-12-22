// src/services/Usuario.Service.ts
import { apiClient } from "./apiClient";

/**
 * DTO EXACTO según backend /api/usuarios
 */
export interface UsuarioApi {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  fotoUrl?: string;

  fechaRegistro?: string;
  ultimoAcceso?: string | null;
  activo: boolean;

  comunidadId?: number | null;
  comunidadNombre?: string | null;
  rol?: string | null;              // ej: "vecino"
  estadoEnComunidad?: string | null; // ej: "activo"
}

export const usuariosService = {
  listar: async (): Promise<UsuarioApi[]> => {
    return apiClient.get<UsuarioApi[]>("/usuarios");
  },

  obtener: async (id: number): Promise<UsuarioApi> => {
    return apiClient.get<UsuarioApi>(`/usuarios/${id}`);
  },
};
