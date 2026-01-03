// src/services/auth.service.ts
import { apiClient } from "./apiClient";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export type UsuarioDTO = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  fotoUrl?: string | null;

  communityId?: number | null;   // compatibilidad
  comunidadId?: number | null;

  rol?: string | null;           // "ADMIN" | "USER"
  estado?: string | null;
};

export type SessionData = {
  userId: number;
  email: string;
  rol: string | null;
  communityId: number | null;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
};

export const authService = {
  // ============================================================
  //  LOGIN TRADICIONAL  (email + password)
  // ============================================================
  async login(email: string, password: string): Promise<UsuarioDTO> {
    const usuario = await apiClient.post<UsuarioDTO>("/usuarios/login", {
      email,
      password,
    });

    // 🔐 Panel solo permite ADMIN
    if (!usuario.rol || usuario.rol.toUpperCase() !== "ADMIN") {
      throw new Error("No tienes permisos de administrador.");
    }

    return usuario;
  },

  // ============================================================
  //  LOGIN CON GOOGLE (Firebase Web → Backend Spring)
  // ============================================================
  async loginWithGoogle(): Promise<UsuarioDTO> {
    // 1) Login popup Google
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    if (!user.email) {
      throw new Error("Google no devolvió un correo válido.");
    }

    // 2) Obtener ID TOKEN de Firebase
    const idToken = await user.getIdToken();

    // 3) Mandarlo al backend
    // apiClient.post(path, body?, token?)
    const resp = await apiClient.post<any>(
      "/usuarios/google-login",
      {},        // body vacío
      idToken    // 👉 se usa como Authorization: Bearer <token>
    );

    // Casos esperados:
    //   200  → { registered:true, usuario:{...} }
    //   409  → { registered:false, message:"..." }

    if (resp.registered === false) {
      throw new Error(
        resp.message ||
          "Tu correo está verificado con Google, pero falta registro legal."
      );
    }

    const usuario: UsuarioDTO = resp.usuario ?? resp;

    // 🔐 Validar rol ADMIN
    if (!usuario.rol || usuario.rol.toUpperCase() !== "ADMIN") {
      throw new Error("No tienes permisos de administrador.");
    }

    return usuario;
  },

  // ============================================================
  //  SESIÓN LOCAL
  // ============================================================
  saveSession(usuario: UsuarioDTO) {
    const communityId = usuario.communityId ?? usuario.comunidadId ?? null;

    const session: SessionData = {
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

  getSession(): SessionData | null {
    const raw = localStorage.getItem("session");
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem("session");
  },
};
