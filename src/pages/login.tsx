import "../styles/login.css";

import loginFrame from "../assets/login.svg";
import iconEmail from "../assets/mage_email.svg";
import iconPassword from "../assets/password-icon.svg";
import iconGoogle from "../assets/iconoGoogle.svg";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Aquí luego conectamos con tu backend Spring Boot (API login)
    // Por ahora solo validamos que haya algo escrito y mandamos al dashboard
    if (!correo.trim() || !password.trim()) {
      alert("Ingresa correo y contraseña");
      return;
    }

    navigate("/dashboard");
  };

  const handleLoginGoogle = () => {
    // Aquí luego integramos Firebase / OAuth, por ahora solo demo
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
              />
            </div>

            <button type="submit" className="btn-primary" id="btnLogin">
              Iniciar Sesión
            </button>
          </form>

          <p className="text">Inicia sesión con</p>

          <button
            className="btn-google"
            type="button"
            onClick={handleLoginGoogle}
          >
            <img
              src={iconGoogle}
              className="google-icon"
              alt="Google icon"
            />
            <span>Inicia sesión con Google</span>
          </button>
        </div>
      </div>
    </>
  );
}
