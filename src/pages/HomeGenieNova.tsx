// src/pages/HomeGenieNova.tsx
// SafeZone — Home (dark 010302 + accent f95150)
// HERO pinned + spotlight + tabs + HOW pinned + DESCARGA estilo referencia + FAQ estilo referencia

import "../styles/home-genienova.css";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ShieldAlert,
  Users,
  BrainCircuit,
  Download,
  Instagram,
  Facebook,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

//IMPORTS DE ASSETS (Vite-friendly)
import HERO_PHONE from "../assets/celular1.webp";
import FEATURE_1 from "../assets/celular4.webp";
import FEATURE_2 from "../assets/celular2.webp";
import FEATURE_3 from "../assets/celular3.webp";
import HOW_1 from "../assets/celular5.webp";
import HOW_2 from "../assets/celular6.webp";
import HOW_3 from "../assets/celular7.webp";
import HOW_4 from "../assets/celular8.webp";

import LOGO from "../assets/logo_SafeZone2.webp"

// CONFIG APK (AÚN NO DISPONIBLE)
// ===============================
/*const APK_CONFIG = {
  available: false,
  message: "Próximamente disponible",
} as const;*/

type Tab = {
  key: string;
  title: string;
  desc: string;
  items: { title: string; note: string; badge?: string }[];
  image: string;
};

export default function HomeGenieNova() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  const phoneFloatRef = useRef<HTMLDivElement | null>(null);
  const phoneTiltRef = useRef<HTMLDivElement | null>(null);

  const tabsImageRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<string>("alerta");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const PARTNERS = useMemo(
    () => [
      "Policía / 911",
      "Municipio",
      "Bomberos",
      "Comités barriales",
      "Seguridad privada",
      "CCTV vecinal",
      "Salud / Ambulancia",
      "Red de confianza",
    ],
    [],
  );

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  const tabs: Tab[] = useMemo(
    () => [
      {
        key: "alerta",
        title: "Alerta Instantánea",
        desc: "Activa el SOS en 3 segundos y notifica a tu red de confianza con ubicación precisa.",
        items: [
          {
            title: "SOS Rápido",
            note: "3 toques para activar emergencia",
            badge: "Más usado",
          },
          { title: "Ubicación GPS", note: "Precisión en tiempo real" },
          { title: "Multi-canal", note: "WiFi, datos móviles y SMS" },
        ],
        image: FEATURE_1,
      },
      {
        key: "comunidad",
        title: "Red Comunitaria",
        desc: "Conecta con vecinos y contactos cercanos para respuesta coordinada.",
        items: [
          {
            title: "Círculo de Confianza",
            note: "Agrega contactos verificados",
            badge: "Más usado",
          },
          { title: "Vecinos Activos", note: "Red local de apoyo inmediato" },
          { title: "Mapa de Calor", note: "Zonas de riesgo en tiempo real" },
        ],
        image: FEATURE_2,
      },
      {
        key: "ia",
        title: "Asistente IA",
        desc: "Inteligencia artificial que prioriza alertas y ofrece recomendaciones según el riesgo.",
        items: [
          {
            title: "Análisis de Riesgo",
            note: "Evalúa la situación automáticamente",
            badge: "Más usado",
          },
          {
            title: "Recomendaciones",
            note: "Guía paso a paso según emergencia",
          },
          { title: "Priorización", note: "Alertas críticas primero" },
        ],
        image: FEATURE_3,
      },
    ],
    [],
  );

  const how = useMemo(
    () => [
      {
        title: "Descarga e Instala",
        body: "Obtén la app desde nuestra web oficial y configura tu perfil de seguridad.",
        image: HOW_1,
      },
      {
        title: "Crea tu Círculo",
        body: "Agrega contactos de confianza y conecta con vecinos de tu zona.",
        image: HOW_2,
      },
      {
        title: "Activa Alerta SOS",
        body: "En emergencia, 3 toques activan el sistema y notifican a toda tu red.",
        image: HOW_3,
      },
      {
        title: "Respuesta Coordinada",
        body: "Tu comunidad recibe tu ubicación y se coordina para asistirte.",
        image: HOW_4,
      },
    ],
    [],
  );

  const community = useMemo(
    () => [
      {
        title: "Ciudadanos",
        desc: "Usuarios activos protegiendo su barrio",
        icon: Users,
      },
      {
        title: "Alertas Diarias",
        desc: "Promedio de emergencias reportadas",
        icon: ShieldAlert,
      },
      {
        title: "Respuesta Rápida",
        desc: "Tiempo promedio de coordinación",
        icon: BrainCircuit,
      },
    ],
    [],
  );

  const faqs = useMemo(
    () => [
      {
        q: "¿Qué es SafeZone?",
        a: "SafeZone es una plataforma de alerta comunitaria que permite reportar emergencias, compartir ubicación en tiempo real y coordinar ayuda con tu red de confianza.",
      },
      {
        q: "¿SafeZone es gratis?",
        a: "Sí. La descarga y uso básico está pensado para la comunidad. Más adelante puedes habilitar funciones avanzadas para administradores o comunidades verificadas.",
      },
      {
        q: "¿Qué incluye el sistema de alertas?",
        a: "SOS rápido, ubicación GPS en tiempo real, notificaciones a contactos, historial y apoyo con recomendaciones basadas en IA para actuar con seguridad.",
      },
      {
        q: "¿Puedo cancelar o dejar de usar SafeZone cuando quiera?",
        a: "Sí. Puedes desinstalar la app en cualquier momento. Si perteneces a una comunidad, puedes salir de la comunidad desde tu perfil cuando lo necesites.",
      },
      {
        q: "¿SafeZone sirve para barrios, urbanizaciones o instituciones?",
        a: "Sí. Puede usarse en barrios, urbanizaciones, campus o instituciones. La idea es crear redes de apoyo con usuarios verificados y respuesta coordinada.",
      },
    ],
    [],
  );

  const activeTabObj = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  function scrollToId(id: string) {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) return;

    const navH = navRef.current?.getBoundingClientRect().height ?? 88;
    const y = el.getBoundingClientRect().top + window.scrollY - (navH + 14);

    window.scrollTo({ top: y, behavior: "smooth" });
  }

  //Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  //Si vuelve a desktop, cerrar menú móvil
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ===========================
  // GSAP: NAV + HERO pinned + reveal + HOW pinned step panel
  // ===========================
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onScroll = () => {
      nav.classList.toggle("sz-nav--scrolled", window.scrollY > 10);
    };

    onScroll(); // aplica al cargar
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      const buildHero = (opts: {
        end: string;
        head0: number;
        head1: number;
        head2: number;
        head3: number;
        headY0: number;
        headY1: number;
        headY2: number;
        headY3: number;
        phoneY1: number;
        phoneY2: number;
        phoneY3: number;
        phoneS1: number;
        phoneS2: number;
        phoneS3: number;
        floorS2: number;
      }) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".sz-hero",
            start: "top top",
            end: opts.end,
            scrub: 0.75,
            pin: ".sz-heroPin",
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        const heroEl = heroRef.current;

        tl.set(".sz-heroType", { opacity: 1 }, 0);
        tl.set(
          ".sz-heroType__inner",
          { scale: opts.head0, y: opts.headY0, transformOrigin: "50% 50%" },
          0,
        );

        tl.set(
          ".sz-hero__inner",
          { autoAlpha: 1, y: 0, filter: "blur(0px)" },
          0,
        );
        tl.set(
          ".sz-hero__phoneStageAnim",
          { y: 0, scale: 1, transformOrigin: "50% 50%" },
          0,
        );

        tl.set(".sz-phone__glow", { opacity: 0.55 }, 0);
        tl.set(".sz-phone__shine", { opacity: 0.32 }, 0);

        tl.set(".sz-phone__ghost", { autoAlpha: 0, y: 60 }, 0);
        tl.to(
          ".sz-phone__ghost--1",
          { autoAlpha: 0.85, y: 0, ease: "none" },
          0.18,
        );
        tl.to(
          ".sz-phone__ghost--2",
          { autoAlpha: 0.65, y: -6, ease: "none" },
          0.22,
        );

        tl.set(".sz-hero__floor", { scale: 1, opacity: 0.95 }, 0);
        tl.set(".sz-hero__fade", { opacity: 0 }, 0);

        if (heroEl) {
          tl.set(
            heroEl,
            {
              "--spotOpacity": 0.82,
              "--spotSize": "920px",
              "--heroFade": 0,
            } as any,
            0,
          );
        }

        if (heroEl) {
          tl.to(
            heroEl,
            {
              "--spotOpacity": 0.95,
              "--spotSize": "980px",
              ease: "none",
            } as any,
            0.15,
          );
        }
        tl.to(
          ".sz-heroType__inner",
          { scale: opts.head1, y: opts.headY1, ease: "none" },
          0.18,
        );
        tl.to(
          ".sz-hero__phoneStageAnim",
          { y: opts.phoneY1, scale: opts.phoneS1, ease: "none" },
          0.18,
        );
        tl.to(".sz-phone__glow", { opacity: 0.62, ease: "none" }, 0.18);
        tl.to(".sz-phone__shine", { opacity: 0.38, ease: "none" }, 0.18);

        tl.to(
          ".sz-heroType__inner",
          { scale: opts.head2, y: opts.headY2, ease: "none" },
          0.45,
        );
        tl.to(
          ".sz-hero__phoneStageAnim",
          { y: opts.phoneY2, scale: opts.phoneS2, ease: "none" },
          0.45,
        );
        tl.to(
          ".sz-hero__inner",
          { autoAlpha: 0, y: -18, filter: "blur(10px)", ease: "none" },
          0.55,
        );

        if (heroEl) {
          tl.to(
            heroEl,
            {
              "--spotOpacity": 0.38,
              "--spotSize": "720px",
              "--heroFade": 1,
              ease: "none",
            } as any,
            0.78,
          );
        }
        tl.to(".sz-hero__fade", { opacity: 1, ease: "none" }, 0.78);
        tl.to(
          ".sz-hero__floor",
          { opacity: 0.18, scale: opts.floorS2, ease: "none" },
          0.78,
        );

        tl.to(".sz-heroType", { opacity: 0.7, ease: "none" }, 0.78);
        tl.to(
          ".sz-heroType__inner",
          { scale: opts.head3, y: opts.headY3, ease: "none" },
          0.78,
        );

        tl.to(
          ".sz-hero__phoneStageAnim",
          { y: opts.phoneY3, scale: opts.phoneS3, ease: "none" },
          0.78,
        );
        tl.to(".sz-phone__glow", { opacity: 0.18, ease: "none" }, 0.78);
        tl.to(".sz-phone__shine", { opacity: 0.1, ease: "none" }, 0.78);

        tl.to(
          ".sz-phone__ghost",
          { autoAlpha: 0, y: -140, ease: "none" },
          0.78,
        );

        tl.to(".sz-hero__phoneStageAnim", { autoAlpha: 0, ease: "none" }, 0.92);
        tl.to(".sz-heroType", { opacity: 0.4, ease: "none" }, 0.92);
      };

      mm.add("(min-width: 900px)", () => {
        buildHero({
          end: "+=220%",
          head0: 0.7,
          head1: 0.84,
          head2: 1.16,
          head3: 1.26,
          headY0: -6,
          headY1: 10,
          headY2: 72,
          headY3: 86,
          phoneY1: -20,
          phoneY2: -190,
          phoneY3: -310,
          phoneS1: 1.04,
          phoneS2: 0.98,
          phoneS3: 0.92,
          floorS2: 1.65,
        });
      });

      mm.add("(max-width: 899px)", () => {
        buildHero({
          end: "+=200%",
          head0: 0.76,
          head1: 0.9,
          head2: 1.12,
          head3: 1.18,
          headY0: -4,
          headY1: 8,
          headY2: 60,
          headY3: 72,
          phoneY1: -14,
          phoneY2: -150,
          phoneY3: -240,
          phoneS1: 1.04,
          phoneS2: 0.98,
          phoneS3: 0.92,
          floorS2: 1.45,
        });
      });

      // Flotación suave del teléfono
      if (!prefersReducedMotion && phoneFloatRef.current) {
        gsap.to(phoneFloatRef.current, {
          y: -10,
          duration: 2.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      // Reveal genérico
      gsap.utils.toArray<HTMLElement>("[data-sz='reveal']").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 18, opacity: 0, filter: "blur(12px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 86%" },
          },
        );
      });

      // HOW pinned (desktop)
      mm.add("(min-width: 900px)", () => {
        const steps = gsap.utils.toArray<HTMLElement>(".sz-howRefStep");
        const phones = gsap.utils.toArray<HTMLElement>(".sz-howRefPhone");
        const dots = gsap.utils.toArray<HTMLElement>(".sz-stepDot");

        if (!steps.length || !phones.length) return;

        gsap.set(steps, { autoAlpha: 0, y: 22, filter: "blur(10px)" });
        gsap.set(phones, {
          autoAlpha: 0,
          y: 70,
          scale: 1.02,
          filter: "blur(0px)",
        });

        gsap.set(steps[0], { autoAlpha: 1, y: 0, filter: "blur(0px)" });
        gsap.set(phones[0], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
        });

        let lastIdx = 0;
        const setDots = (idx: number) => {
          dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
        };
        setDots(0);

        const N = steps.length;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#como",
            start: "top top",
            end: `+=${N * 120}%`,
            scrub: 0.9,
            pin: ".sz-howRefPin",
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const idx = Math.min(N - 1, Math.floor(self.progress * N));
              if (idx !== lastIdx) {
                lastIdx = idx;
                setDots(idx);
              }
            },
          },
        });

        let pos = 0;
        for (let i = 0; i < N - 1; i++) {
          const t = pos + 0.85;

          tl.to(
            steps[i],
            {
              autoAlpha: 0,
              y: -16,
              filter: "blur(10px)",
              duration: 0.28,
              ease: "none",
            },
            t,
          );
          tl.to(
            phones[i],
            {
              autoAlpha: 0,
              y: -70,
              scale: 0.985,
              duration: 0.28,
              ease: "none",
            },
            t,
          );

          tl.fromTo(
            steps[i + 1],
            { autoAlpha: 0, y: 24, filter: "blur(10px)" },
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.28,
              ease: "none",
            },
            t,
          );

          tl.fromTo(
            phones[i + 1],
            { autoAlpha: 0, y: 80, scale: 1.02 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "none" },
            t,
          );

          pos += 1;
        }
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => mm.revert();
    }, rootRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // Spotlight + tilt 3D con el mouse
  useEffect(() => {
    if (prefersReducedMotion) return;
    const heroEl = heroRef.current;
    const tiltEl = phoneTiltRef.current;
    if (!heroEl || !tiltEl) return;

    const handleMove = (e: PointerEvent) => {
      const rect = heroEl.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      heroEl.style.setProperty("--mx", `${relX * 100}%`);
      heroEl.style.setProperty("--my", `${relY * 100}%`);

      const tiltX = (0.5 - relY) * 14;
      const tiltY = (relX - 0.5) * 18;

      gsap.to(tiltEl, {
        rotateX: tiltX,
        rotateY: tiltY,
        transformPerspective: 900,
        transformOrigin: "50% 50%",
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const handleLeave = () => {
      heroEl.style.setProperty("--mx", "50%");
      heroEl.style.setProperty("--my", "32%");
      gsap.to(tiltEl, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.45,
        ease: "power2.out",
      });
    };

    heroEl.addEventListener("pointermove", handleMove);
    heroEl.addEventListener("pointerleave", handleLeave);

    return () => {
      heroEl.removeEventListener("pointermove", handleMove);
      heroEl.removeEventListener("pointerleave", handleLeave);
    };
  }, [prefersReducedMotion]);

  // Magnetic buttons
  useEffect(() => {
    if (prefersReducedMotion) return;

    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-magnetic='true']"),
    );
    const cleanups: Array<() => void> = [];

    els.forEach((btn) => {
      const strength = Number(
        btn.getAttribute("data-magnetic-strength") || 0.35,
      );

      const move = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;

        gsap.to(btn, {
          x: dx * 18 * strength,
          y: dy * 14 * strength,
          duration: 0.22,
          ease: "power2.out",
        });
      };

      const leave = () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.35, ease: "power3.out" });
      };

      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", leave);

      cleanups.push(() => {
        btn.removeEventListener("pointermove", move);
        btn.removeEventListener("pointerleave", leave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [prefersReducedMotion]);

  // Cambio suave de imagen en tabs
  useEffect(() => {
    if (!tabsImageRef.current) return;
    gsap.fromTo(
      tabsImageRef.current,
      { opacity: 0, y: 10, filter: "blur(10px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.55,
        ease: "power3.out",
      },
    );
  }, [activeTab]);

  const onLogoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") scrollToId("top");
  };

  return (
    <div className="sz-page" ref={rootRef}>
      {/* NAV */}
      <header className="sz-nav" ref={navRef}>
        <div className="sz-container sz-nav__inner">
          <div
            className="sz-logo"
            onClick={() => scrollToId("top")}
            onKeyDown={onLogoKeyDown}
            role="button"
            tabIndex={0}
          >
            <img src={LOGO} alt="SafeZone" />
            <span className="sz-logo__text">SafeZone</span>
          </div>

          <nav className="sz-links" aria-label="Navegación principal">
            <button onClick={() => scrollToId("funciones")}>Funciones</button>
            <button onClick={() => scrollToId("como")}>Cómo Funciona</button>
            <button onClick={() => scrollToId("comunidad")}>Comunidad</button>
            <button onClick={() => scrollToId("descarga")}>Descarga</button>
            <button onClick={() => scrollToId("faq")}>Preguntas</button>
          </nav>

          <div className="sz-nav__right">
            <a
              className="sz-btn sz-btn--primary"
              href="/login"
              data-magnetic="true"
            >
              Login Admin
            </a>

            <button
              className={`sz-burger ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop + Menú móvil */}
      <div
        className={`sz-backdrop ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />

      <div
        className={`sz-mobileMenu ${menuOpen ? "is-open" : ""}`}
        role="dialog"
        aria-label="Menú móvil"
      >
        <div className="sz-mobileMenu__inner">
          <button
            className="sz-mobileMenu__item"
            onClick={() => scrollToId("funciones")}
          >
            Funciones
          </button>
          <button
            className="sz-mobileMenu__item"
            onClick={() => scrollToId("como")}
          >
            Cómo Funciona
          </button>
          <button
            className="sz-mobileMenu__item"
            onClick={() => scrollToId("comunidad")}
          >
            Comunidad
          </button>
          <button
            className="sz-mobileMenu__item"
            onClick={() => scrollToId("descarga")}
          >
            Descarga
          </button>
          <button
            className="sz-mobileMenu__item"
            onClick={() => scrollToId("faq")}
          >
            Preguntas
          </button>

          <a
            className="sz-btn sz-btn--primary sz-btn--full"
            href="/login"
            data-magnetic="true"
          >
            Login Admin
          </a>
        </div>
      </div>

      {/* HERO PINNED */}
      <section className="sz-hero" id="top" ref={heroRef}>
        <div className="sz-heroPin">
          <div className="sz-hero__bg" aria-hidden />
          <div className="sz-hero__grain" aria-hidden />
          <div className="sz-hero__spot" aria-hidden />
          <div className="sz-hero__floor" aria-hidden />
          <div className="sz-hero__fade" aria-hidden />

          <div className="sz-heroType" aria-hidden>
            <div className="sz-heroType__inner">
              <div className="sz-heroType__row">
                Tu Espacio <span className="sz-accentSolid">Seguro</span>
              </div>
              <div className="sz-heroType__row">
                y <span className="sz-accentFade">Conectado</span>
              </div>
            </div>
          </div>

          {/*ahora SI va dentro de container para que sea responsivo */}
          <div className="sz-hero__inner">
            <div className="sz-container sz-hero__innerGrid">
              <div className="sz-hero__copy">
                <h1 className="sz-h1">
                  <span>Alerta</span> comunitaria con IA
                </h1>
                <p className="sz-hero__p">
                  SafeZone convierte a tu barrio en una red de apoyo: reporta
                  emergencias en segundos, ubica ayuda cercana y recibe
                  recomendaciones guiadas por inteligencia artificial.
                </p>

                <div className="sz-hero__cta">
                  <a
                    className="sz-btn sz-btn--primary"
                    href="#descarga"
                    data-magnetic="true"
                  >
                    Descargar Ahora
                  </a>
                  <button
                    className="sz-btn sz-btn--ghost"
                    onClick={() => scrollToId("funciones")}
                    data-magnetic="true"
                  >
                    Ver Funciones
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="sz-hero__phoneStageOuter" aria-hidden>
            <div className="sz-hero__phoneStageAnim">
              <div className="sz-phone" ref={phoneFloatRef}>
                <div className="sz-phone__tilt" ref={phoneTiltRef}>
                  <img
                    className="sz-phone__img"
                    src={HERO_PHONE}
                    alt="SafeZone App"
                  />
                  <img
                    className="sz-phone__ghost sz-phone__ghost--1"
                    src={FEATURE_1}
                    alt=""
                    aria-hidden
                  />
                  <img
                    className="sz-phone__ghost sz-phone__ghost--2"
                    src={FEATURE_2}
                    alt=""
                    aria-hidden
                  />
                  <span className="sz-phone__glow" />
                  <span className="sz-phone__shine" />
                  <span className="sz-phone__shadow" />
                </div>
              </div>
            </div>
          </div>

          <div className="sz-scrollHint" aria-hidden>
            <span />
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="sz-partners" aria-label="Partners">
        <div className="sz-container">
          <div className="sz-partners__label">Con el respaldo de</div>
        </div>

        <div className="sz-marquee" aria-hidden>
          <div className="sz-marquee__track">
            {[...PARTNERS, ...PARTNERS].map((t, i) => (
              <div className="sz-pill" key={`${t}-${i}`}>
                <span className="sz-pillDot" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONES */}
      <section className="sz-section" id="funciones">
        <div className="sz-container">
          <div className="sz-sectionHead" data-sz="reveal">
            <h2 className="sz-h2">Funciones Principales</h2>
            <p className="sz-muted">
              Todo lo que necesitas para estar seguro y conectado con tu
              comunidad.
            </p>
          </div>

          <div className="sz-toolsGrid">
            <div className="sz-tabs" data-sz="reveal">
              <div className="sz-tabs__top">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    className={`sz-tab ${
                      activeTab === t.key ? "is-active" : ""
                    }`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              <div className="sz-tabs__body">
                <h3 className="sz-h3">{activeTabObj.title}</h3>
                <p className="sz-muted">{activeTabObj.desc}</p>

                <div className="sz-list">
                  {activeTabObj.items.map((it) => (
                    <div className="sz-listItem" key={it.title}>
                      <div className="sz-listItem__left">
                        <div className="sz-bullet" />
                        <div>
                          <div className="sz-listItem__title">
                            {it.title}
                            {it.badge ? (
                              <span className="sz-badge">{it.badge}</span>
                            ) : null}
                          </div>
                          <div className="sz-listItem__note">{it.note}</div>
                        </div>
                      </div>
                      <div className="sz-chevron" aria-hidden>
                        →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sz-shot" data-sz="reveal">
              <div className="sz-shot__frame" ref={tabsImageRef}>
                <img
                  src={activeTabObj.image}
                  alt={`${activeTabObj.title} preview`}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA — STEP PANEL */}
      <section className="sz-section sz-section--tight sz-howRef" id="como">
        <div className="sz-container">
          <div className="sz-sectionHead" data-sz="reveal">
            <h2 className="sz-h2">Cómo Funciona</h2>
            <p className="sz-muted">
              Scroll para avanzar paso a paso, como en el diseño de referencia.
            </p>
          </div>
        </div>

        <div
          className="sz-howRefScroll"
          style={{ ["--steps" as any]: how.length }}
        >
          <div className="sz-howRefPin">
            <div className="sz-howRefBg" aria-hidden />
            <div className="sz-howRefTopline" aria-hidden />
            <div className="sz-howRefLines" aria-hidden />
            <div className="sz-howRefWash" aria-hidden />

            <div className="sz-container sz-howRefGrid">
              {/* LEFT */}
              <div className="sz-howRefLeft">
                <div className="sz-howRefSteps">
                  {how.map((step, i) => (
                    <div className="sz-howRefStep" key={step.title}>
                      <div className="sz-stepBadge">
                        <div className="sz-stepNum">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div className="sz-stepLabel">Paso</div>
                      </div>
                      <div className="sz-howRefTitle">{step.title}</div>
                      <div className="sz-howRefText">{step.body}</div>
                    </div>
                  ))}
                </div>

                <div className="sz-stepDots" aria-hidden>
                  {how.map((_, i) => (
                    <span
                      key={i}
                      className={`sz-stepDot ${i === 0 ? "is-active" : ""}`}
                    />
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div
                className="sz-howRefRight"
                aria-label="Vista previa por pasos"
              >
                <div className="sz-howRefStage">
                  <div className="sz-howRefStageGlow" aria-hidden />

                  <div className="sz-howRefPhones" aria-hidden>
                    {how.map((step, i) => (
                      <img
                        key={step.image}
                        className="sz-howRefPhone"
                        src={step.image}
                        alt={`Paso ${i + 1}`}
                        loading="lazy"
                      />
                    ))}
                  </div>

                  <div className="sz-howRefMeta" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMUNIDAD */}
      <section className="sz-section" id="comunidad">
        <div className="sz-container">
          <div className="sz-sectionHead" data-sz="reveal">
            <h2 className="sz-h2">Nuestra Comunidad</h2>
            <p className="sz-muted">
              Miles de personas protegiendo su barrio cada día.
            </p>
          </div>

          <div className="sz-communityGrid" data-sz="reveal">
            {community.map((a) => (
              <div className="sz-communityCard" key={a.title}>
                <div className="sz-communityIcon">
                  <a.icon />
                </div>
                <div className="sz-communityTitle">{a.title}</div>
                <div className="sz-muted">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DESCARGA */}
      {/* DESCARGA */}
      <section className="sz-cta" id="descarga">
        <div className="sz-container">
          <div className="sz-cta__inner" data-sz="reveal">
            <div className="sz-cta__gridBg" aria-hidden />
            <div
              className="sz-cta__glowSide sz-cta__glowSide--left"
              aria-hidden
            />
            <div
              className="sz-cta__glowSide sz-cta__glowSide--right"
              aria-hidden
            />

            <div className="sz-cta__phones" aria-hidden>
              <img
                className="sz-cta__phoneCorner sz-cta__phoneCorner--tr"
                src={FEATURE_1}
                alt=""
              />
              <img
                className="sz-cta__phoneCorner sz-cta__phoneCorner--bl"
                src={HERO_PHONE}
                alt=""
              />
            </div>

            <div className="sz-cta__content">
              <h2 className="sz-cta__title">Descarga SafeZone</h2>
              <p className="sz-cta__subtitle">
                Tu seguridad y la de tu barrio en la palma de tu mano. Descarga
                la APK oficial para Android y mantente conectado con tu red de
                confianza.
              </p>

              <div className="sz-cta__buttons">
                {/*BOTÓN CORREGIDO */}
                <a
                  className="sz-btn sz-btn--primary"
                  data-magnetic="true"
                  aria-label="Descargar APK de SafeZone"
                >
                  <Download size={20} />
                  Descargar APK
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sz-faq" id="faq">
        <div className="sz-container sz-faqGrid" data-sz="reveal">
          <div className="sz-faqLeft">
            <div className="sz-faqTitle">
              Tus Preguntas<span className="sz-faqAccent">,</span>
              <br />
              Respondidas
            </div>
            <p className="sz-faqLead">
              Dudas comunes sobre SafeZone: descarga, uso, comunidades y
              alertas. Si necesitas algo más específico, escríbenos por redes.
            </p>
          </div>

          <div className="sz-faqRight" aria-label="Preguntas frecuentes">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  className={`sz-faqItem ${open ? "is-open" : ""}`}
                  key={f.q}
                >
                  <button
                    type="button"
                    className="sz-faqQ"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="sz-faqIcon" aria-hidden>
                      ?
                    </span>
                    <span className="sz-faqQText">{f.q}</span>
                    <span className="sz-faqPlus" aria-hidden />
                  </button>

                  <div className="sz-faqA" aria-hidden={!open}>
                    <div className="sz-faqAInner">{f.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="sz-footer">
        <div className="sz-container sz-footer__inner">
          <div className="sz-footer__left">
            <div
              className="sz-logo"
              onClick={() => scrollToId("top")}
              onKeyDown={onLogoKeyDown}
              role="button"
              tabIndex={0}
            >
              <img src={LOGO} alt="SafeZone" />
              <span className="sz-logo__text">SafeZone</span>
            </div>

            <div className="sz-muted">
              © 2025 SafeZone — Todos los derechos reservados
            </div>

            <div className="sz-social">
              <a
                href="https://www.instagram.com/safe.zoneoficial/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61586934939710"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook />
              </a>
            </div>
          </div>

          <div className="sz-footer__links" aria-label="Links de pie de página">
            <button onClick={() => scrollToId("funciones")}>Funciones</button>
            <button onClick={() => scrollToId("como")}>Cómo Funciona</button>
            <button onClick={() => scrollToId("comunidad")}>Comunidad</button>
            <button onClick={() => scrollToId("descarga")}>Descarga</button>
            <button onClick={() => scrollToId("faq")}>Preguntas</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
