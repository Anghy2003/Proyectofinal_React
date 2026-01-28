import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { authService } from "../services/auth.service";

import logoSafeZone from "../assets/logo_SafeZone.png";
import iconDashboard from "../assets/icon_casa.svg";
import iconUsuario from "../assets/icon_usuario.svg";
import iconComu from "../assets/icon_comunidad.svg";
import iconRepo from "../assets/icon_reporte.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_ajuste.svg";

// ✅ Preload de páginas (code-splitting)
const preload = {
  dashboard: () => import("../pages/Dashboard"),
  comunidades: () => import("../pages/comunidades"),
  usuarios: () => import("../pages/usuarios"),
  analisis: () => import("../pages/analisis"),
  reportes: () => import("../pages/reportes"),
  codigoAcceso: () => import("../pages/codigocmu"),
};

type SidebarProps = {
  sidebarOpen?: boolean;
  closeSidebar?: () => void;
  showCloseButton?: boolean;
};

export default function Sidebar({
  sidebarOpen = false,
  closeSidebar,
  showCloseButton = false,
}: SidebarProps) {
  const navigate = useNavigate();
  const me = authService.getSession();

  // 🔹 Modal confirmación
  const [showConfirm, setShowConfirm] = useState(false);

  const onClose = () => closeSidebar?.();

  // 👉 Click en “Salir” (NO cierra sesión todavía)
  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  // 👉 Confirmar cierre de sesión
  const confirmLogout = () => {
    setShowConfirm(false);
    onClose();
    authService.logout();
    navigate("/login", { replace: true });
  };

  // 👉 Cancelar
  const cancelLogout = () => {
    setShowConfirm(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-item ${isActive ? "active" : ""}`;

  return (
    <>
      {/* ================= SIDEBAR ================= */}
      <motion.aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        initial={false}
        aria-label="Menú"
      >
        <div className="sidebar-header">
          <img src={logoSafeZone} alt="SafeZone" className="sidebar-logo" />
          <div className="sidebar-title">SafeZone Admin</div>

          {showCloseButton && (
            <button
              type="button"
              className="sidebar-close"
              aria-label="Cerrar menú"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/dashboard"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.dashboard()}
            onFocus={() => preload.dashboard()}
          >
            <img src={iconDashboard} className="nav-icon" alt="Panel" />
            <span>Panel</span>
          </NavLink>

          <NavLink
            to="/comunidades"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.comunidades()}
            onFocus={() => preload.comunidades()}
          >
            <img src={iconComu} className="nav-icon" alt="Comunidades" />
            <span>Comunidades</span>
          </NavLink>

          <NavLink
            to="/usuarios"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.usuarios()}
            onFocus={() => preload.usuarios()}
          >
            <img src={iconUsuario} className="nav-icon" alt="Usuarios" />
            <span>Usuarios</span>
          </NavLink>

          <div className="sidebar-section-label">MANAGEMENT</div>

          <NavLink
            to="/analisis"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.analisis()}
            onFocus={() => preload.analisis()}
          >
            <img src={iconIa} className="nav-icon" alt="IA" />
            <span>IA Análisis</span>
          </NavLink>

          <NavLink
            to="/reportes"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.reportes()}
            onFocus={() => preload.reportes()}
          >
            <img src={iconRepo} className="nav-icon" alt="Reportes" />
            <span>Reportes</span>
          </NavLink>

          <NavLink
            to="/codigo-acceso"
            className={linkClass}
            onClick={onClose}
            onMouseEnter={() => preload.codigoAcceso()}
            onFocus={() => preload.codigoAcceso()}
          >
            <img src={iconAcceso} className="nav-icon" alt="Ajustes" />
            <span>Ajustes</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-connected">
            <div className="sidebar-connected-title">Conectado como</div>
            <div className="sidebar-connected-name">{me?.rol ?? "Admin"}</div>
          </div>

          <button
            id="btnSalir"
            className="sidebar-logout"
            onClick={handleLogoutClick}
          >
            Salir
          </button>

          <span className="sidebar-version">v1.0 — SafeZone</span>
        </div>
      </motion.aside>

      {/* ================= MODAL CONFIRMACIÓN ================= */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelLogout}
            />

            <motion.div
              className="modal-confirm"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h3>¿Cerrar sesión?</h3>
              <p>Tu sesión se cerrará y deberás iniciar sesión nuevamente.</p>

              <div className="modal-actions">
                <button className="btn-secondario" onClick={cancelLogout}>
                  Cancelar
                </button>

                <button className="btn-primario" onClick={confirmLogout}>
                  Sí, cerrar sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
