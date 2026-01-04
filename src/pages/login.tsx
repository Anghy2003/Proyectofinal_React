// src/pages/Login.tsx
import "../styles/login.css";

import iconEmail from "../assets/mage_email.svg";
import iconPassword from "../assets/password-icon.svg";
import iconGoogle from "../assets/iconoGoogle.svg";
import flechaBack from "../assets/flecha_salir.png";

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

  // ================== LOGIN NORMAL ==================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correo.trim() || !password.trim()) {
      alert("Ingresa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const usuario = await authService.login(correo.trim(), password.trim());
      authService.saveSession(usuario);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo iniciar sesión. Verifica tus credenciales.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ================== LOGIN GOOGLE ==================
  const handleLoginGoogle = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const usuario = await authService.loginWithGoogle();
      authService.saveSession(usuario);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo iniciar sesión con Google.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Fondo imagen */}
      <div className="login-background" />

      {/* Fondo animado */}
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

      {/* Botón volver */}
      <button className="back-home-btn" onClick={() => navigate("/")}>
        <img src={flechaBack} alt="Volver" />
      </button>

      {/* Contenido */}
      <div className="login-wrapper">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h1 className="title">Bienvenido</h1>
          <p className="subtitle">Inicia sesión para continuar</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <img src={iconEmail} className="input-icon" alt="Correo" />
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
