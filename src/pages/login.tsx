// src/pages/Login.tsx
import "../styles/login.css";

import iconEmail from "../assets/mage_email.svg";
import iconPassword from "../assets/password-icon.svg";
import iconGoogle from "../assets/iconoGoogle.svg";
import flechaBack from "../assets/flecha_salir.png";
import logoSafezone from "../assets/logo_rojo.png";

import LiquidEther from "../components/backgrounds/LiquidEther";
import { motion } from "framer-motion";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";

export default function Login() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Un SOLO mensaje superior (banner)
  const [formError, setFormError] = useState<string | null>(null);

  // ✅ Normaliza mensajes (por si el backend sí responde con error)
  const normalizeAuthError = (err: any): string => {
    const status = err?.response?.status;
    const rawMsg = String(
      err?.response?.data?.message || err?.message || ""
    ).toLowerCase();

    // 🟧 Permisos admin (detectar por texto, SIN depender del status)
    if (
      rawMsg.includes("permiso") ||
      rawMsg.includes("permisos") ||
      rawMsg.includes("administrador") ||
      rawMsg.includes("admin") ||
      rawMsg.includes("role") ||
      rawMsg.includes("forbidden") ||
      rawMsg.includes("no autorizado")
    ) {
      return "Tu cuenta no tiene permisos de administrador.";
    }

    // 🟥 Usuario no existe
    if (
      rawMsg.includes("usuario no encontrado") ||
      rawMsg.includes("user not found") ||
      rawMsg.includes("no existe")
    ) {
      return "Correo o contraseña incorrectos.";
    }

    // 🟨 Credenciales incorrectas
    if (
      status === 401 ||
      status === 403 ||
      rawMsg.includes("credencial") ||
      rawMsg.includes("contraseña") ||
      rawMsg.includes("password") ||
      rawMsg.includes("invalid") ||
      rawMsg.includes("unauthorized")
    ) {
      return "Correo o contraseña incorrectos.";
    }

    // 🟦 Otros errores (red/servidor)
    return "No se pudo iniciar sesión. Inténtalo nuevamente.";
  };

  // ✅ Verifica rol admin en el objeto usuario (SOLUCIÓN DEFINITIVA)
  const isAdminUser = (usuario: any) => {
    const rol = String(usuario?.rol ?? usuario?.role ?? "").toUpperCase();
    // Acepta variantes comunes: "ADMIN", "ROLE_ADMIN"
    return rol === "ADMIN" || rol === "ROLE_ADMIN";
  };

  // ================== LOGIN NORMAL ==================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setFormError(null);

    const c = correo.trim();
    const p = password.trim();

    // ✅ Validación pro: SOLO banner
    if (!c || !p) {
      setFormError("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const usuario = await authService.login(c, p);

      // ✅ Si el usuario existe pero NO es admin → mensaje correcto
      if (!isAdminUser(usuario)) {
        setFormError("Tu cuenta no tiene permisos de administrador.");
        return; // 👈 no guarda sesión ni navega
      }

      // ✅ Solo si es admin
      authService.saveSession(usuario);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setFormError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ================== LOGIN GOOGLE ==================
  const handleLoginGoogle = async () => {
    if (loading) return;

    setLoading(true);
    setFormError(null);

    try {
      const usuario = await authService.loginWithGoogle();

      // ✅ También aplica para Google
      if (!isAdminUser(usuario)) {
        setFormError("Tu cuenta no tiene permisos de administrador.");
        return;
      }

      authService.saveSession(usuario);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      const msg = String(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo iniciar sesión con Google."
      );
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />

      <LiquidEther
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <button className="back-home-btn" onClick={() => navigate("/")}>
        <img src={flechaBack} alt="Volver" />
      </button>

      <div className="login-wrapper">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="login-logo">
            <img src={logoSafezone} alt="SafeZone logo" />
          </div>

          <h1 className="title2">Bienvenido</h1>
          <p className="subtitle2">Inicia sesión para continuar</p>

          {/* ✅ Banner superior (único error visible) */}
          {formError && (
            <div className="login-alert" role="alert" aria-live="polite">
              {formError}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form" noValidate>
            <div className="input-group">
              <img src={iconEmail} className="input-icon" alt="Correo" />
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (formError) setFormError(null);
                }}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <img src={iconPassword} className="input-icon" alt="Contraseña" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              id="btnLogin"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="divider">
            <span>o</span>
          </div>

          <button
            className="btn-google"
            type="button"
            onClick={handleLoginGoogle}
            disabled={loading}
          >
            <img src={iconGoogle} className="google-icon" alt="Google icon" />
            <span>Inicia sesión con Google</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
