// src/services/auth.service.ts
import { apiClient } from "./apiClient";

export type UsuarioDTO = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  fotoUrl?: string | null;

  // Estos campos existen en tu UsuarioDTO (porque lo construyes con UsuarioComunidad)
  communityId?: number | null;     // o comunidadId según tu DTO real
  comunidadId?: number | null;
  rol?: string | null;             // "ADMIN" | "USER" etc.
  estado?: string | null;
};

export type LoginResponse = UsuarioDTO; // tu backend devuelve UsuarioDTO directo

export const authService = {
  async login(email: string, password: string): Promise<UsuarioDTO> {
    // OJO: tu backend espera keys: "email" y "password"
    return apiClient.post<UsuarioDTO>("/usuarios/login", { email, password });
  },

  logout() {
    localStorage.removeItem("session");
  },

  saveSession(usuario: UsuarioDTO) {
    // Normaliza nombres posibles según tu DTO
    const communityId = usuario.communityId ?? usuario.comunidadId ?? null;

    const session = {
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol ?? null,
      communityId,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      fotoUrl: usuario.fotoUrl ?? null,
    };

    localStorage.setItem("session", JSON.stringify(session));
  },

  getSession(): null | {
    userId: number;
    email: string;
    rol: string | null;
    communityId: number | null;
    nombre: string;
    apellido: string;
    fotoUrl: string | null;
  } {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
