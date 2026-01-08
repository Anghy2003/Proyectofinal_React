// src/components/ConfirmLogoutModal.tsx
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmLogoutModal({ open, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          <motion.div
            className="modal-confirm"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h3>¿Cerrar sesión?</h3>
            <p>Tu sesión actual se cerrará de forma segura.</p>

            <div className="modal-actions">
              <button className="btn-secondario" onClick={onCancel}>
                Cancelar
              </button>
              <button className="btn-primario" onClick={onConfirm}>
                Sí, cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
