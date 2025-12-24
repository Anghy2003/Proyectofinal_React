// src/pages/Login.tsx
import "../styles/login.css";

import loginFrame from "../assets/login.svg";
import iconEmail from "../assets/mage_email.svg";
import iconPassword from "../assets/password-icon.svg";
import iconGoogle from "../assets/iconoGoogle.svg";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authService } from "../services/auth.service";

export default function Login() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correo.trim() || !password.trim()) {
      alert("Ingresa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const usuario = await authService.login(correo.trim(), password.trim());

      // Guarda sesión para usar userId/rol en todo el panel admin
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

  const handleLoginGoogle = () => {
    alert("Login con Google (pendiente integración)");
  };

  return (
    <>
      <div className="login-background" />

      <div className="login-wrapper">
        {/* Imagen del recuadro */}
        <img src={loginFrame} className="login-frame" alt="Login Frame" />

        {/* Contenido sobre la imagen */}
        <div className="login-content">
          <h1 className="title">Bienvenido</h1>

          <form onSubmit={handleLogin} style={{ width: "100%" }}>
            {/* Campos */}
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
              <img
                src={iconPassword}
                className="input-icon"
                alt="Contraseña"
              />
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
          >
            <img src={iconGoogle} className="google-icon" alt="Google icon" />
            <span>Inicia sesión con Google</span>
          </button>
        </div>
      </div>
    </>
  );
}
