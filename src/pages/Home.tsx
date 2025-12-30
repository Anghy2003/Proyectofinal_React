// ===========================
// src/pages/Home.tsx
// SafeZone — Home (UI 2025 + más claro + animaciones + Lenis + SNAP fullpage + HUD Novaqua-like)
// ===========================
import "./../styles/home.css";
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import Lottie from "lottie-react";
import SafeZoneAIChat from "../components/chatbotIA";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import Lenis from "lenis";
import "lenis/dist/lenis.css";

import { Link } from "react-router-dom";

import {
  ShieldAlert,
  Users,
  BrainCircuit,
  Download,
  Instagram,
  Facebook,
  ArrowDown,
  Star,
  ShieldCheck,
  MapPin,
  BellRing,
  Smartphone,
  Radar,
  HeartHandshake,
  UserCheck,
  Siren,
  MessageCircle,
  BadgeCheck,
  Share2,
} from "lucide-react";

import logo from "../assets/logo-safe-zone.png";
import heroGif from "../assets/celularfondo.gif";

// FONDOS (ROTAN)
import heroBg1 from "../assets/cupulas1.png";
import heroBg2 from "../assets/fondo1.png";
import heroBg3 from "../assets/fondo2.png";
import heroBg4 from "../assets/fondo3.png";

import fondoComu from "../assets/ques.png";

// imagen comunidad
import imageComu from "../assets/imagenespersonas.png";

// Celus (descarga)
import celusImg from "../assets/celus.png";

import sosAnimation from "../assets/sos-alert.json";

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
  maxRotate = 12,
  scale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(card, {
      rotateY: x * maxRotate * 2,
      rotateX: -y * maxRotate * 2,
      scale,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.65,
      ease: "power2.out",
    });
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

/** Orden oficial de secciones (para HUD + snap) */
const SNAP_SECTIONS = [
  { id: "#inicio", label: "Inicio" },
  { id: "#proyecto", label: "Proyecto" },
  { id: "#que-es", label: "¿Qué es?" },
  { id: "#comunidad", label: "Comunidad" },
  { id: "#descarga", label: "Descarga" },
  { id: "#opiniones", label: "Opiniones" },
  { id: "#footer", label: "Footer" },
];

const COMMUNITY_ITEMS = [
  { Icon: ShieldCheck, label: "Círculo de confianza" },
  { Icon: Users, label: "Vecinos cercanos" },
  { Icon: MapPin, label: "Ubicación precisa" },
  { Icon: BellRing, label: "Alertas inmediatas" },
  { Icon: Siren, label: "Modo emergencia" },
  { Icon: Smartphone, label: "Acción en segundos" },
  { Icon: Radar, label: "Perímetro activo" },
  { Icon: UserCheck, label: "Contactos verificados" },
  { Icon: MessageCircle, label: "Coordinación rápida" },
  { Icon: Share2, label: "Compartir alerta" },
  { Icon: BadgeCheck, label: "Red confiable" },
  { Icon: HeartHandshake, label: "Apoyo comunitario" },
];

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export default function Home() {
  const [bgIndex, setBgIndex] = useState(0);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const lenisRef = useRef<Lenis | null>(null);

  // ===== SNAP refs
  const sectionElsRef = useRef<HTMLElement[]>([]);
  const snapLockRef = useRef(false);
  const snapUnlockTimerRef = useRef<number | null>(null);

  // HUD state (dots + flecha)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({
    name: "",
    rating: 5,
    comment: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ====== Lenis (smooth scroll 2025) + ScrollTrigger sync
  useEffect(() => {
    const lenis = new Lenis({
      smoothWheel: true,
      lerp: 0.085,
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });

    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      // GSAP ticker entrega "time" en segundos -> Lenis espera ms
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  /** lock/unlock snap + overlay */
  const lockFor = (ms: number) => {
    snapLockRef.current = true;
    setIsSnapping(true);

    if (snapUnlockTimerRef.current) {
      window.clearTimeout(snapUnlockTimerRef.current);
      snapUnlockTimerRef.current = null;
    }

    snapUnlockTimerRef.current = window.setTimeout(() => {
      snapLockRef.current = false;
      setIsSnapping(false);
      snapUnlockTimerRef.current = null;
    }, ms);
  };

  /** Detecta la sección “activa” (la que cruza el centro del viewport) */
  const getActiveIndex = () => {
    const mid = window.innerHeight * 0.5;
    const list = sectionElsRef.current;

    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return i;
    }

    // fallback: la más cercana arriba
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      const dist = Math.abs(r.top);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };

  /** Scroll “oficial” por índice (para dots + flecha) */
  const scrollToIndex = (idx: number, withLock = true) => {
    const list = sectionElsRef.current;
    const target = list[idx];
    if (!target) return;

    if (withLock) lockFor(1100);

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, {
        offset: 0,
        duration: 1.05,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    }
  };

  // ====== SNAP "tipo Novaqua": cuando llegas al borde de una sección, salta suave a la siguiente/anterior.
  useEffect(() => {
    const sections = SNAP_SECTIONS
      .map((s) => document.querySelector(s.id) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];

    sectionElsRef.current = sections;

    const updateActive = () => {
      const i = getActiveIndex();
      setActiveSectionIdx(i);
    };

    updateActive();

    const onScroll = () => {
      // suaviza: no spamear setState
      requestAnimationFrame(updateActive);
    };

    const onWheel = (e: WheelEvent) => {
      // Si estás escribiendo en inputs/textarea, no forzar snap
      const el = e.target as HTMLElement | null;
      const isTyping =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable);
      if (isTyping) return;

      if (snapLockRef.current) {
        e.preventDefault();
        return;
      }

      const delta = e.deltaY;
      const i = getActiveIndex();
      const list = sectionElsRef.current;
      const current = list[i];
      if (!current) return;

      const r = current.getBoundingClientRect();
      const threshold = 10; // px

      // Si la sección es más alta que el viewport, dejamos scroll normal dentro.
      if (delta > 0) {
        const atBottom = r.bottom <= window.innerHeight + threshold;
        if (!atBottom) return;

        const next = Math.min(i + 1, list.length - 1);
        if (next === i) return;

        e.preventDefault();
        scrollToIndex(next, true);
      } else if (delta < 0) {
        const atTop = r.top >= -threshold;
        if (!atTop) return;

        const prev = Math.max(i - 1, 0);
        if (prev === i) return;

        e.preventDefault();
        scrollToIndex(prev, true);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (snapLockRef.current) return;

      const isArrow =
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === "ArrowUp" ||
        e.key === "PageUp";
      if (!isArrow) return;

      const i = getActiveIndex();
      const list = sectionElsRef.current;
      const current = list[i];
      if (!current) return;

      const r = current.getBoundingClientRect();
      const threshold = 10;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        const atBottom = r.bottom <= window.innerHeight + threshold;
        if (!atBottom) return;

        const next = Math.min(i + 1, list.length - 1);
        if (next === i) return;

        e.preventDefault();
        scrollToIndex(next, true);
      }

      if (e.key === "ArrowUp" || e.key === "PageUp") {
        const atTop = r.top >= -threshold;
        if (!atTop) return;

        const prev = Math.max(i - 1, 0);
        if (prev === i) return;

        e.preventDefault();
        scrollToIndex(prev, true);
      }
    };

    // Captura: antes que Lenis procese el wheel
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      if (snapUnlockTimerRef.current) window.clearTimeout(snapUnlockTimerRef.current);
    };
  }, []);

  const snapScrollToSelector =
    (selector: string) => (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;

      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(el, {
          offset: 0,
          duration: 1.05,
          easing: (t: number) => 1 - Math.pow(1 - t, 4),
        });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }
    };

  useEffect(() => {
    const saved = localStorage.getItem("safezone-reviews");
    if (saved) setReviews(JSON.parse(saved));
  }, []);

  // Cambio automático del fondo
  useEffect(() => {
    const id = window.setInterval(() => {
      setBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  // Variants de reveal (TIPADO) para evitar error TS en `variants`
  const reveal: Variants = {
    hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.75, ease: [0.2, 0.8, 0.2, 1] },
    },
  };

  useGSAP(
    () => {
      // Header entrance
      gsap.from(".hero-logo, .hero-nav a, .hero-login-btn", {
        opacity: 0,
        y: -16,
        duration: 0.8,
        stagger: 0.06,
        ease: "power3.out",
      });

      // Cards
      gsap.from(".project-card", {
        opacity: 0,
        y: 70,
        duration: 1.1,
        stagger: 0.16,
        ease: "power3.out",
        scrollTrigger: { trigger: ".project-section", start: "top 72%" },
      });

      gsap.from(".about-content", {
        opacity: 0,
        y: 40,
        duration: 1.0,
        ease: "power3.out",
        scrollTrigger: { trigger: ".about-section", start: "top 75%" },
      });

      gsap.from(".community-icon-chip", {
        opacity: 0,
        y: 18,
        duration: 0.9,
        stagger: 0.05,
        ease: "power3.out",
        scrollTrigger: { trigger: ".community-section", start: "top 75%" },
      });

      gsap.from(".download-btn", {
        opacity: 0,
        y: 18,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".download-section", start: "top 78%" },
      });

      gsap.from(".review-form-wrapper, .reviews-list", {
        opacity: 0,
        y: 24,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".reviews-section", start: "top 78%" },
      });

      gsap.from(".footer-top > *, .footer-bottom", {
        opacity: 0,
        y: 22,
        duration: 0.9,
        stagger: 0.10,
        ease: "power3.out",
        scrollTrigger: { trigger: ".footer", start: "top 86%" },
      });
    },
    { scope: pageRef }
  );

  const handleDownloadApk = () => window.open(APK_URL, "_blank");

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) return;

    setIsSubmitting(true);

    const review: Review = {
      id: Date.now().toString(),
      name: newReview.name,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem("safezone-reviews", JSON.stringify(updated));
    setNewReview({ name: "", rating: 5, comment: "" });
    setIsSubmitting(false);
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onChange?: (rating: number) => void
  ) => (
    <div className="stars-container">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= rating ? "filled" : ""}`}
          onClick={() => interactive && onChange && onChange(star)}
          disabled={!interactive}
          aria-label={`Calificación ${star}`}
        >
          <Star
            size={interactive ? 28 : 18}
            fill={star <= rating ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );

  // HUD: progreso del “aro” (conic-gradient)
  const total = Math.max(1, SNAP_SECTIONS.length - 1);
  const progress = Math.min(1, Math.max(0, activeSectionIdx / total));
  const ringStyle = {
    ["--p" as any]: `${Math.round(progress * 360)}deg`,
  } as React.CSSProperties;

  const showScrollHint = activeSectionIdx < SNAP_SECTIONS.length - 1;

  return (

    <div ref={pageRef} className="page-root">
      {/* ===== overlay snap (sutil) ===== */}
      <AnimatePresence>
        {isSnapping && (
          <motion.div
            className="snap-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ===== paginador lateral (dots) ===== */}
      <nav className="page-pager" aria-label="Secciones">
        {SNAP_SECTIONS.map((s, idx) => (
          <button
            key={s.id}
            className={`pager-dot ${idx === activeSectionIdx ? "is-active" : ""}`}
            onClick={() => scrollToIndex(idx, true)}
            aria-label={s.label}
            aria-current={idx === activeSectionIdx ? "page" : undefined}
          >
            <span className="pager-dot__label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== flecha centrada abajo (Novaqua-like) ===== */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.button
            className="scroll-hint"
            onClick={() => scrollToIndex(Math.min(activeSectionIdx + 1, SNAP_SECTIONS.length - 1), true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            aria-label="Bajar a la siguiente sección"
          >
            <div className="scroll-hint__core" style={ringStyle}>
              <ArrowDown className="scroll-hint__arrow" />
            </div>
            <div className="scroll-hint__label">SCROLL</div>
          </motion.button>
        )}
      </AnimatePresence>


      {/* CHAT IA FLOTANTE EN TODA LA HOME */}
      <SafeZoneAIChat />
      {/* ================= HERO ================= */}
      <section className="hero has-grain" id="inicio">
        <div className="hero-bg-slider" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={HERO_BACKGROUNDS[bgIndex]}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt="Fondo SafeZone"
              className="hero-bg-image"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7 }}
            />
          </AnimatePresence>
        </div>

        <div className="hero-overlay" aria-hidden="true" />

        <header className="hero-header">
          <div className="hero-logo">
            <img src={logo} alt="SafeZone" />
          </div>

          <nav className="hero-nav" aria-label="Navegación principal">
            <motion.a
              href="#inicio"
              onClick={snapScrollToSelector("#inicio")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Inicio
            </motion.a>

            <motion.a
              href="#proyecto"
              onClick={snapScrollToSelector("#proyecto")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Proyecto
            </motion.a>

            <motion.a
              href="#comunidad"
              onClick={snapScrollToSelector("#comunidad")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Comunidad
            </motion.a>

            <motion.a
              href="#descarga"
              onClick={snapScrollToSelector("#descarga")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Descarga
            </motion.a>

            <motion.a
              href="#opiniones"
              onClick={snapScrollToSelector("#opiniones")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Opiniones
            </motion.a>
          </nav>

          <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/login" className="hero-login-btn btn-shine">
              LOGIN ADMINISTRADOR
            </Link>
          </motion.div>
        </header>

        <main className="hero-main">
          <section className="hero-left">
            <motion.div
              className="hero-left-panel"
              initial={{ opacity: 0, x: -50, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="hero-pill">
                <span className="hero-pill-dot" />
                ALERTA COMUNITARIA · INTELIGENTE
              </div>

              <h1 className="hero-title">
                Tu espacio <br /> seguro y <br /> conectado
              </h1>

              <p className="hero-subtitle">
                SafeZone convierte a tu barrio en una red de apoyo: reporta
                emergencias en segundos, ubica ayuda cercana y recibe
                recomendaciones guiadas por IA.
              </p>

              <div className="hero-tags">
                <span className="hero-tag">SOS EN 3 TOQUES</span>
                <span className="hero-tag">MAPA DE CALOR</span>
                <span className="hero-tag">IA DE SEGURIDAD</span>
              </div>

              <div className="hero-bottom-copy">
                <ArrowDown className="hero-arrow-icon" />
                <p>Tecnología para cuidar personas.</p>
              </div>
            </motion.div>
          </section>

          <section className="hero-right">
            <div className="hero-phones-wrapper">
              <motion.img
                src={heroGif}
                className="hero-phone-gif"
                alt="App Preview"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.12 }}
              />

              <motion.div
                className="hero-sos-pill"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="hero-sos-lottie">
                  <Lottie animationData={sosAnimation} loop />
                </div>
                <span>SOS activo para tu comunidad</span>
              </motion.div>

              <p className="hero-version">Disponible para Android · V1.0</p>
            </div>
          </section>
        </main>

        <div className="section-fade-bottom" aria-hidden="true" />
      </section>

      {/* ================= PROYECTO ================= */}
      <section id="proyecto" className="project-section has-grain">
        <div className="project-bg" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={`proj-${HERO_BACKGROUNDS[bgIndex]}`}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt=""
              className="project-bg-photo"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7 }}
            />
          </AnimatePresence>

          <div className="project-bg-mesh" />
          <div className="project-bg-mask" />
        </div>

        <div className="project-content">
          <div className="section-header">
            <h2 className="project-title-main">NUESTRO PROYECTO</h2>
            <div className="project-underline" />
          </div>

          <div className="project-cards">
            <TiltCard className="project-card card-red">
              <div className="project-icon-wrapper">
                <ShieldAlert size={32} />
              </div>
              <h3>
                Alerta Instantánea <br /> Híbrida
              </h3>
              <p>
                Sistema que conmuta automáticamente entre WiFi, datos y SMS para
                garantizar el envío del SOS en cualquier condición.
              </p>
            </TiltCard>

            <TiltCard className="project-card card-blue">
              <div className="project-icon-wrapper">
                <Users size={32} />
              </div>
              <h3>
                Perímetro <br /> Humano
              </h3>
              <p>
                Geolocalización en tiempo real que activa a los vecinos y
                contactos más cercanos para una respuesta inmediata.
              </p>
            </TiltCard>

            <TiltCard className="project-card card-purple">
              <div className="project-icon-wrapper">
                <BrainCircuit size={32} />
              </div>
              <h3>
                Guardián <br /> IA
              </h3>
              <p>
                Inteligencia artificial que prioriza alertas y ofrece
                recomendaciones basadas en el tipo de riesgo que estés viviendo.
              </p>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ================= ¿QUÉ ES? ================= */}
      <section className="about-section has-grain" id="que-es">
        <div className="about-bg" aria-hidden="true">
          <img src={fondoComu} alt="Ciudad" />
        </div>

        <motion.div
          className="about-content"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
        >
          <h2 className="about-title">¿Qué es SafeZone?</h2>
          <p className="about-text">
            Un sistema digital de alerta comunitaria inteligente con comunicación
            híbrida e IA, diseñado para optimizar la respuesta ciudadana ante
            emergencias.
          </p>
          <div className="about-tags">
            <span>WIFI + SMS</span>
            <span>GEOLOCALIZACIÓN</span>
            <span>IA ASISTENTE</span>
          </div>
        </motion.div>
      </section>

      {/* ================= COMUNIDAD ================= */}
      <section className="community-section has-grain" id="comunidad">
        <div className="community-bg" aria-hidden="true">
          <img className="community-bg-photo" src={imageComu} alt="" />
          <div className="community-bg-mesh" />
          <div className="community-bg-mask" />
        </div>

        <div className="community-inner">
          <motion.div
            className="community-text"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="community-kicker">
              <ShieldCheck size={22} className="comu-icon" />
              <span>Red de apoyo real</span>
            </div>

            <h2>Comunidad</h2>

            <p>
              SafeZone no es solo una app; es el vínculo digital con tus vecinos.
              Aquí construyes tu círculo de confianza para apoyarse mutuamente.
            </p>
            <p>
              Al activar una alerta, movilizas a tu red cercana para una
              respuesta coordinada mientras llegan las autoridades.
            </p>

            <div className="community-icons">
              {COMMUNITY_ITEMS.map(({ Icon, label }, i) => (
                <motion.div
                  key={i}
                  className="community-icon-chip"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="chip-ic">
                    <Icon size={18} />
                  </span>
                  <span className="chip-tx">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="community-illustration"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="community-photo-card">
              <img src={imageComu} alt="Personas de la comunidad" />
            </div>
          </motion.div>
        </div>

        <div
          className="section-fade-bottom section-fade-bottom--soft"
          aria-hidden="true"
        />
      </section>

      {/* ================= DESCARGA ================= */}
      <section className="download-section has-grain" id="descarga">
        <div className="download-bg" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={`dl-${HERO_BACKGROUNDS[bgIndex]}`}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt=""
              className="download-bg-photo"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7 }}
            />
          </AnimatePresence>

          <div className="mesh-gradient-bg" />
          <div className="download-bg-mask" />
        </div>

        <div className="download-inner">
          <motion.div
            className="download-text"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
          >
            <h1>
              Descarga el <br /> APK Oficial
            </h1>
            <p>
              Tu seguridad y la de tu barrio en la palma de tu mano. Disponible
              ahora.
            </p>

            <motion.button
              className="download-btn btn-shine"
              onClick={handleDownloadApk}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Download size={24} />
              <span>DESCARGAR APK (V1.0)</span>
            </motion.button>
          </motion.div>

          <motion.div
            className="download-visual"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="download-phone-stage">
              <div className="download-rotator">
                <img
                  className="download-celus"
                  src={celusImg}
                  alt="SafeZone en Android"
                />
              </div>
            </div>

            <p className="os-label">Disponible para Android</p>
          </motion.div>
        </div>
      </section>

      {/* ================= OPINIONES ================= */}
      <section className="reviews-section has-grain" id="opiniones">
        <div className="reviews-bg" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={`rv-${HERO_BACKGROUNDS[bgIndex]}`}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt=""
              className="reviews-bg-photo"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7 }}
            />
          </AnimatePresence>

          <div className="reviews-bg-mesh" />
          <div className="reviews-bg-mask" />
        </div>

        <div className="reviews-container">
          <div className="reviews-header">
            <h2>Lo que dicen nuestros usuarios</h2>
          </div>

          <motion.div
            className="review-form-wrapper"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <h3>Comparte tu experiencia</h3>

            <form onSubmit={handleSubmitReview} className="review-form">
              <input
                type="text"
                placeholder="Tu nombre"
                value={newReview.name}
                onChange={(e) =>
                  setNewReview({ ...newReview, name: e.target.value })
                }
                required
              />

              <div className="rating-selector">
                <span>Tu calificación:</span>
                {renderStars(newReview.rating, true, (rating) =>
                  setNewReview({ ...newReview, rating })
                )}
              </div>

              <textarea
                placeholder="Escribe aquí tu opinión..."
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview({ ...newReview, comment: e.target.value })
                }
                required
              />

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="btn-shine"
                whileHover={!isSubmitting ? { y: -2, scale: 1.01 } : undefined}
                whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
              >
                {isSubmitting ? "Enviando..." : "Publicar opinión"}
              </motion.button>
            </form>
          </motion.div>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="no-reviews">Sé el primero en comentar.</p>
            ) : (
              <div className="reviews-grid">
                {reviews.map((r) => (
                  <motion.div
                    key={r.id}
                    className="review-card"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="review-user">
                      <div className="avatar">{r.name[0].toUpperCase()}</div>
                      <div>
                        <h4>{r.name}</h4>
                        <span>{r.date}</span>
                      </div>
                    </div>
                    {renderStars(r.rating)}
                    <p>{r.comment}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="section-fade-bottom section-fade-bottom--soft"
          aria-hidden="true"
        />
      </section>

      {/* ================= FOOTER ================= */}
      <footer id="footer" className="footer has-grain">
        <div className="footer-bg" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.img
              key={`ft-${HERO_BACKGROUNDS[bgIndex]}`}
              src={HERO_BACKGROUNDS[bgIndex]}
              alt=""
              className="footer-bg-photo"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7 }}
            />
          </AnimatePresence>

          <div className="footer-bg-mesh" />
          <div className="footer-bg-mask" />
        </div>

        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <img src={logo} alt="SafeZone" />
              <p>Tu seguridad, nuestra comunidad.</p>
            </div>

            <nav className="footer-nav" aria-label="Navegación footer">
              <a href="#inicio" onClick={snapScrollToSelector("#inicio")}>
                Inicio
              </a>
              <a href="#proyecto" onClick={snapScrollToSelector("#proyecto")}>
                Proyecto
              </a>
              <a href="#descarga" onClick={snapScrollToSelector("#descarga")}>
                Descarga
              </a>
            </nav>

            <div className="footer-social" aria-label="Redes sociales">
              <motion.a
                href="#"
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Instagram"
              >
                <Instagram />
              </motion.a>

              <motion.a
                href="#"
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Facebook"
              >
                <Facebook />
              </motion.a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2025 SafeZone · Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
