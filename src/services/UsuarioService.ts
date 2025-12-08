// src/service/UsuarioService.ts
import axios from "axios";
import type { AxiosInstance } from "axios";

// Ajusta si tu backend tiene distinta URL
const API_BASE_URL = "http://localhost:8080/api";

// ===== Tipos del backend =====
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
}

// ===== Servicio Axios =====
class UsuarioService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  async getUsuarios(): Promise<UsuarioApi[]> {
    const response = await this.api.get<UsuarioApi[]>("/usuarios");
    return response.data;
  }
}

export const usuarioService = new UsuarioService();
