// src/pages/Login.tsx
import "../styles/login.css";

import loginFrame from "../assets/login_layout.png";
import iconEmail from "../assets/mage_email.svg";
import iconPassword from "../assets/password-icon.svg";
import iconGoogle from "../assets/iconoGoogle.svg";
import flechaBack from "../assets/flecha_salir.png";

import { motion } from "framer-motion";

/* 👇 IMÁGENES PERSONALIZADAS */
import heroCommunity from "../assets/comunidad3.png";
import logoSafezone from "../assets/logo_rojo.png";

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
    <>
      {/* 🌆 Fondo general */}
      <div className="login-background" />

      {/* Botón volver al Home */}
      <button className="back-home-btn" onClick={() => navigate("/")}>
        <img src={flechaBack} alt="Volver" />
      </button>

      <div className="login-wrapper">
        <img src={loginFrame} className="login-frame" alt="Login Frame" />

        <motion.div
          className="hero-wrapper-community"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0],
            scale: [1, 1.03, 1],
          }}
          transition={{
            opacity: { duration: 0.8, ease: "easeOut" },
            y: {
              duration: 6,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            scale: {
              duration: 6,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
        >
          <img
            src={heroCommunity}
            className="login-hero-community"
            alt="Comunidad SafeZone"
          />
        </motion.div>

        {/* 📍 Logo — animación separada */}
        <motion.div
          className="hero-wrapper-logo"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            y: [0, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            opacity: { duration: 0.8, ease: "easeOut" },
            y: {
              duration: 6,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
            scale: {
              duration: 6,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
        >
          <img
            src={logoSafezone}
            className="login-hero-logo"
            alt="Logo SafeZone"
          />
        </motion.div>

        {/* 🧾 FORMULARIO */}
        <motion.div
          className="login-content"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        >
          <h1 className="title">Bienvenido</h1>

          <form onSubmit={handleLogin} style={{ width: "100%" }}>
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

          <p className="text">Inicia sesión con</p>

          <button
            className="btn-google"
            type="button"
            onClick={handleLoginGoogle}
            disabled={loading}
            //holis
          >
            <img src={iconGoogle} className="google-icon" alt="Google icon" />
            <span>Inicia sesión con Google</span>
          </button>
        </motion.div>
      </div>
    </>
  );
}
