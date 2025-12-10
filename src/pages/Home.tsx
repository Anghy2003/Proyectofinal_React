// src/pages/Home.tsx
import "./../styles/home.css";
import { Link } from "react-router-dom";

import logo from "../assets/logo-safe-zone.png";
import heroVisual from "../assets/logocelular.png";
import arrowDown from "../assets/flechaAbajo.svg";
import fondoComu from "../assets/fondocomunidad.png";
import iconoSos from "../assets/logo1.png";
import iconoGeo from "../assets/logo2.png";
import iconoAi from "../assets/logo3.png";
import imageComu from "../assets/gente.png";
import iconoComu from "../assets/iconComuni.svg";
import lineasGeometricas from "../assets/lineas_geome.png";
import iconDesc from "../assets/iconDesc.svg";
import celularIncli from "../assets/celular3.png";

export default function Home() {
  return (
    <>
      <section className="hero">
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
      </section>

      {/* ¿QUÉ ES SAFEZONE? */}
      <section className="about-section" id="que-es">
        <div className="about-bg">
          <img src={fondoComu} alt="Mapa SafeZone" />
        </div>

        <div className="about-content">
          <h2>¿Qué es SafeZone?</h2>
          <p>
            Sistema digital de alerta comunitaria inteligente con
            geolocalización, comunicación híbrida (WiFi/SMS) e inteligencia
            artificial, que permite reportar y recibir emergencias en tiempo
            real y optimizar la respuesta ciudadana.
          </p>
        </div>
      </section>

      {/* ==================== SECCIÓN PROYECTO ==================== */}
      <section id="proyecto" className="project-section">
        <h2 className="project-title">Proyecto</h2>

        <div className="project-cards">
          {/* CARD 1 */}
          <div className="project-card project-card--red">
            <div className="project-card-inner">
              <div className="project-icon-wrapper">
                <img src={iconoSos} alt="SOS" className="project-icon" />
              </div>

              <div className="project-title-wrapper">
                <h3>Alerta Instantánea Híbrida</h3>
              </div>

              <div className="project-text">
                <p>
                  Activación instantánea en cualquier condición. Nuestro sistema
                  envía tu pedido de auxilio en milisegundos.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 2 */}
          <div className="project-card project-card--teal">
            <div className="project-card-inner">
              <div className="project-icon-wrapper">
                <img
                  src={iconoGeo}
                  alt="Red de apoyo"
                  className="project-icon"
                />
              </div>

              <div className="project-title-wrapper">
                <h3>Red de apoyo local</h3>
              </div>

              <div className="project-text">
                <p>
                  La alerta se geolocaliza y notifica instantáneamente a la
                  comunidad y contactos de confianza creando un perímetro de
                  seguridad humana.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3 */}
          <div className="project-card project-card--blue">
            <div className="project-card-inner">
              <div className="project-icon-wrapper">
                <img
                  src={iconoAi}
                  alt="IA Seguridad"
                  className="project-icon"
                />
              </div>

              <div className="project-title-wrapper">
                <h3>Asistente Virtual de Seguridad</h3>
              </div>

              <div className="project-text">
                <p>
                  Nuestro Asistente con IA te guía paso a paso. Pregunta qué
                  hacer en cualquier emergencia y recibe recomendaciones
                  personalizadas al instante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMUNIDAD */}
      <section className="community-section" id="comunidad">
        <div className="community-inner">
          <div className="community-text">
            {/* 🔵 ICONO DE CABECERA */}
            <img
              src={iconoComu}
              alt="Icono Comunidad"
              className="community-icon"
            />

            <h2>Comunidad</h2>

            <p>
              SafeZone no es solo una app de alertas individuales; es el vínculo
              digital con las personas que te rodean. En esta sección,
              construyes tu círculo de confianza: vecinos, familiares y amigos
              dispuestos a apoyarse mutuamente.
            </p>

            <p>
              Cuando se activa una alerta, no solo notificas a las autoridades,
              sino que movilizas a tu red cercana para una respuesta inmediata y
              coordinada. Porque el apoyo mutuo es la herramienta de prevención
              más poderosa.
            </p>
          </div>

          <div className="community-illustration">
            <img src={imageComu} alt="Personas de la comunidad" />
          </div>
        </div>
      </section>
      {/* ============= PATRÓN GEOMÉTRICO SUPERIOR ============= */}
      <section className="download-pattern-block">
        <img src={lineasGeometricas} alt="Patrón geométrico" />
      </section>

      {/* ============= SECCIÓN DESCARGA APK ============= */}
      <section className="download-section" id="descarga">
        <div className="download-inner">
          <div className="download-text">
            <h1>Descarga el APK</h1>
            <h1>Oficial</h1>
            <br />
            <p>
              Tu seguridad y la de tu comunidad en la palma de tu mano. Descarga
              SafeZone y vive con mayor tranquilidad.
            </p>

            <button className="download-btn">
              <span className="download-btn-icon">
                <img src={iconDesc} alt="Descargar APK" />
              </span>
              <span>DESCARGAR APK (V1.0)</span>
            </button>
          </div>

          <div className="download-phone">
            <img src={celularIncli} alt="App SafeZone" />
            <p className="download-note">Disponible para Android.</p>
          </div>
        </div>
      </section>
    </>
  );
}
