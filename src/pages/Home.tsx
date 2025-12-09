// src/pages/Home.tsx
import "./../styles/home.css";
import { Link } from "react-router-dom";

import logo from "../assets/logo-safe-zone.png";
import heroVisual from "../assets/logocelular.png";
import arrowDown from "../assets/flechaAbajo.svg";

export default function Home() {
  return (
    <div className="hero">
      {/* HEADER */}
      <header className="hero-header">
        <div className="hero-logo">
          <img src={logo} alt="SafeZone" />
        </div>
        <nav className="hero-nav">
          <a href="#inicio">Inicio</a>
          <a href="#comunidad">Comunidad</a>
          <a href="#descarga">Descarga</a>
        </nav>

        <Link to="/login" className="hero-login-btn">
          LOGIN ADMINISTRADOR
        </Link>
      </header>

      {/* CONTENIDO */}
      <main className="hero-main">
        <section className="hero-left">
          <h1>
            Tu espacio <br />
            seguro y <br />
            conectado
          </h1>

          <div className="hero-bottom-copy">
            <img src={arrowDown} className="hero-arrow" />
            <p>
              Creamos tecnología para cuidar <br />
              personas, no solo para conectar <br />
              dispositivos.
            </p>
          </div>
        </section>

        <section className="hero-right">
          <div className="hero-phone-wrapper">
            <img src={heroVisual} className="hero-visual" />
          </div>
        </section>
      </main>
    </div>
        
    
  );
}
