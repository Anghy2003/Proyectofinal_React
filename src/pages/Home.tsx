// src/pages/Home.tsx
import "./../styles/home.css";
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";

import { motion, AnimatePresence } from "motion/react";
import Lottie from "lottie-react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { Link } from "react-router-dom";

import logo from "../assets/logo-safe-zone.png";
import heroGif from "../assets/celularfondo.gif";
import arrowDown from "../assets/flechaAbajo.svg";

// FONDOS DEL HERO (rotan)
import heroBg1 from "../assets/cupulas1.png";
import heroBg2 from "../assets/fondo1.png";
import heroBg3 from "../assets/fondo2.png";
import heroBg4 from "../assets/fondo3.png";

import fondoComu from "../assets/ques.png";
import iconoSos from "../assets/logo1.png";
import iconoGeo from "../assets/logo2.png";
import iconoAi from "../assets/logo3.png";

// NUEVA IMAGEN DE COMUNIDAD
import imageComu from "../assets/comunidadpersonas.png";

import iconoComu from "../assets/iconComuni.svg";
import lineasGeometricas from "../assets/lineas_geome.png";
import iconDesc from "../assets/iconDesc.svg";
import iconoInsta from "../assets/iconInsta.svg";
import iconoFace from "../assets/iconFace.svg";

// Video exportado de Spline para la sección de descarga
import mockupVideo from "../assets/spinerfono.mp4";

// Lottie (botón SOS)
import sosAnimation from "../assets/sos-alert.json";

// =====================================
//  GSAP SETUP
// =====================================
gsap.registerPlugin(ScrollTrigger);

/* ================= COMPONENTE REUTILIZABLE DE TILT ================= */

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxRotate?: number;
  scale?: number;
};

function TiltCard({
  children,
  className = "",
  maxRotate = 14,
  scale = 1.04,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = x / rect.width - 0.5;
    const percentY = y / rect.height - 0.5;

    const rotateY = percentX * maxRotate * 2;
    const rotateX = -percentY * maxRotate * 2;

    card.style.transform = `
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(${scale})
    `;
  };

  const handleMouseLeave = () => {
    const card = ref.current;
    if (!card) return;

    card.style.transform = `
      rotateX(0deg)
      rotateY(0deg)
      scale(1)
    `;
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/* ========================= HOME ========================= */

const APK_URL = "https://tu-servidor.com/SafeZone-v1.apk";
const HERO_BACKGROUNDS = [heroBg1, heroBg2, heroBg3, heroBg4];

export default function Home() {
  const [bgIndex, setBgIndex] = useState(0);
  const pageRef = useRef<HTMLDivElement | null>(null);

  // Cambio automático del fondo del hero
  useEffect(() => {
    const id = window.setInterval(() => {
      setBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
    }, 9000);

    return () => window.clearInterval(id);
  }, []);

  // Animaciones GSAP (scroll reveal 2025)
  useGSAP(
    () => {
      // PROYECTO
      gsap.from(".project-card", {
        opacity: 0,
        y: 80,
        duration: 1.2,
        stagger: 0.18,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".project-section",
          start: "top 72%",
        },
      });

      // ¿QUÉ ES SAFEZONE?
      gsap.from(".about-content > *", {
        opacity: 0,
        y: 40,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".about-section",
          start: "top 70%",
        },
      });

      // COMUNIDAD
      gsap.from(".community-text > *, .community-illustration", {
        opacity: 0,
        y: 50,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: {
          trigger: ".community-section",
          start: "top 75%",
        },
      });

      // DESCARGA
      gsap.from(".download-text > *, .download-phone", {
        opacity: 0,
        y: 60,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.16,
        scrollTrigger: {
          trigger: ".download-section",
          start: "top 75%",
        },
      });

      // FOOTER
      gsap.from(".footer-top, .footer-bottom", {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".footer",
          start: "top 85%",
        },
      });
    },
    { scope: pageRef }
  );

  const handleDownloadApk = () => {
    window.open(APK_URL, "_blank");
  };

  return (
    <div ref={pageRef} className="page-root">
      {/* ================= HERO ================= */}
      <section className="hero" id="inicio">
        {/* SLIDER DE FONDO (Motion) */}
        <div className="hero-bg-slider">
          <AnimatePresence mode="wait">
            <motion.img
              key={HERO_BACKGROUNDS[bgIndex]}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt="Fondo SafeZone Cuenca"
              className="hero-bg-image"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          </AnimatePresence>
        </div>

        {/* HEADER */}
        <header className="hero-header">
          <motion.div
            className="hero-logo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img src={logo} alt="SafeZone" />
          </motion.div>

          <motion.nav
            className="hero-nav"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          >
            <a href="#inicio">Inicio</a>
            <a href="#que-es">¿Qué es?</a>
            <a href="#comunidad">Comunidad</a>
            <a href="#descarga">Descarga</a>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            <Link to="/login" className="hero-login-btn">
              LOGIN ADMINISTRADOR
            </Link>
          </motion.div>
        </header>

        {/* CONTENIDO HERO */}
        <main className="hero-main">
          {/* LADO IZQUIERDO */}
          <section className="hero-left">
            <motion.div
              className="hero-left-panel"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="hero-pill">
                <span className="hero-pill-dot" />
                ALERTA COMUNITARIA · INTELIGENTE
              </div>

              <h1 className="hero-title">
                Tu espacio
                <br />
                seguro y
                <br />
                conectado
              </h1>

              <p className="hero-subtitle">
                SafeZone convierte a tu barrio en una red de apoyo: reporta
                emergencias en segundos, ubica ayuda cercana y recibe
                recomendaciones guiadas por IA, incluso con baja conectividad.
              </p>

              <div className="hero-tags">
                <span className="hero-tag">SOS en 3 toques</span>
                <span className="hero-tag">Mapa de calor del barrio</span>
                <span className="hero-tag">IA que prioriza alertas</span>
                <span className="hero-tag">WiFi + SMS de respaldo</span>
              </div>

              <div className="hero-bottom-copy">
                <img
                  src={arrowDown}
                  className="hero-arrow"
                  alt="Desplázate"
                />
                <p>
                  Creamos tecnología para cuidar personas,
                  <br />
                  no solo para conectar dispositivos.
                </p>
              </div>
            </motion.div>
          </section>

          {/* LADO DERECHO: TELÉFONOS + PASTILLA SOS */}
          <section className="hero-right">
            <div className="hero-orbit hero-orbit--blue" />

            <motion.div
              className="hero-phones-wrapper"
              initial={{ opacity: 0, x: 80, rotate: 10 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
            >
              <div className="hero-phone-stack">
                <div className="hero-phone hero-phone--front">
                  <img
                    src={heroGif}
                    className="hero-phone-media"
                    alt="Interfaz SOS SafeZone"
                  />
                </div>
              </div>

              <motion.div
                className="hero-sos-pill"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.5 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="hero-sos-lottie">
                  <Lottie animationData={sosAnimation} loop autoplay />
                </div>
                <span>SOS activo para tu comunidad</span>
              </motion.div>

              <motion.p
                className="hero-sos-caption"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
              >
                Disponible para Android · Versión 1.0
              </motion.p>
            </motion.div>
          </section>
        </main>
      </section>

      {/* ==================== PROYECTO ==================== */}
      <section id="proyecto" className="project-section">
        <h2 className="project-title">Proyecto</h2>

        <div className="project-cards">
          {/* CARD 1 */}
          <div className="project-card project-card--red">
            <TiltCard>
              <div className="project-card-inner">
                <div className="project-icon-wrapper">
                  <img src={iconoSos} alt="SOS" className="project-icon" />
                </div>

                <div className="project-title-wrapper">
                  <h3>Alerta Instantánea Híbrida</h3>
                </div>

                <div className="project-text">
                  <p>
                    Activación instantánea en cualquier condición. Nuestro
                    sistema envía tu pedido de auxilio en milisegundos
                    utilizando internet y SMS como respaldo.
                  </p>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* CARD 2 */}
          <div className="project-card project-card--teal">
            <TiltCard>
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
                    La alerta se geolocaliza y notifica a tu comunidad y
                    contactos de confianza, creando un perímetro de seguridad
                    humana alrededor de ti.
                  </p>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* CARD 3 */}
          <div className="project-card project-card--blue">
            <TiltCard>
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
                    Nuestro asistente con IA te guía paso a paso: qué hacer, a
                    quién llamar y cómo actuar, según el tipo de emergencia que
                    estés viviendo.
                  </p>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ==================== ¿QUÉ ES SAFEZONE? ==================== */}
      <section className="about-section" id="que-es">
        <div className="about-bg">
          <img src={fondoComu} alt="Ciudad conectada con SafeZone" />
        </div>

        <div className="about-content">
          <h2 className="about-title">¿Qué es SafeZone?</h2>

          <p className="about-text">
            Sistema digital de alerta comunitaria inteligente con
            geolocalización, comunicación híbrida (WiFi/SMS) e inteligencia
            artificial, que permite reportar y recibir emergencias en tiempo
            real y optimizar la respuesta ciudadana.
          </p>

          <div className="about-tags">
            <span className="about-tag">SOS en 3 toques</span>
            <span className="about-tag">Mapas de calor del barrio</span>
            <span className="about-tag">IA que prioriza alertas</span>
            <span className="about-tag">WiFi + SMS de respaldo</span>
          </div>

          <p className="about-tagline">
            Creamos tecnología para cuidar personas,
            <br />
            no solo para conectar dispositivos.
          </p>
        </div>
      </section>

      {/* ==================== COMUNIDAD ==================== */}
      <section className="community-section" id="comunidad">
        <div className="community-inner">
          <div className="community-text">
            <motion.img
              src={iconoComu}
              alt="Icono Comunidad"
              className="community-icon"
              animate={{ y: [-4, 4, -4] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            />

            <h2>Comunidad</h2>

            <p>
              SafeZone no es solo una app de alertas individuales; es el vínculo
              digital con las personas que te rodean. En esta sección construyes
              tu círculo de confianza: vecinos, familiares y amigos dispuestos a
              apoyarse mutuamente.
            </p>

            <p>
              Cuando se activa una alerta, no solo notificas a las autoridades,
              sino que movilizas a tu red cercana para una respuesta inmediata y
              coordinada. El apoyo mutuo se convierte en la primera línea de
              prevención.
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
            <p>
              Tu seguridad y la de tu comunidad en la palma de tu mano.
              Descarga SafeZone y vive con mayor tranquilidad, sin importar si
              estás en casa, camino a la universidad o de regreso al trabajo.
            </p>

            <motion.button
              className="download-btn"
              type="button"
              onClick={handleDownloadApk}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <span className="download-btn-icon">
                <img src={iconDesc} alt="Descargar APK" />
              </span>
              <span>DESCARGAR APK (V1.0)</span>
            </motion.button>
          </div>

          <div className="download-phone">
            <button
              type="button"
              className="download-phone-3d"
              onClick={handleDownloadApk}
            >
              <video
                className="spline-frame"
                src={mockupVideo}
                autoPlay
                loop
                muted
                playsInline
              />
            </button>

            <p className="download-note">Disponible para Android.</p>
          </div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-col footer-col-left">
            <img src={logo} alt="SafeZone" className="footer-logo" />
            <p className="footer-text-small">
              Tu seguridad, nuestra
              <br />
              comunidad.
            </p>
          </div>

          <div className="footer-col footer-col-center">
            <h3 className="footer-title">EXPLORAR</h3>
            <nav className="footer-nav">
              <a href="#inicio">Inicio</a>
              <a href="#que-es">¿Qué es?</a>
              <a href="#comunidad">Comunidad</a>
              <a href="#descarga">Descarga</a>
            </nav>
          </div>

          <div className="footer-col footer-col-right">
            <h3 className="footer-title">Síguenos</h3>
            <div className="footer-social">
              <a href="#" aria-label="Instagram">
                <img src={iconoInsta} alt="Instagram" />
              </a>
              <a href="#" aria-label="Facebook">
                <img src={iconoFace} alt="Facebook" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p>Última versión 1.0</p>
        </div>
      </footer>
    </div>
  );
}
