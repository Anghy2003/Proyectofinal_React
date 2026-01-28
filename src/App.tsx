// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

import Home from "./pages/HomeGenieNova"; // ✅ NO lazy
import Login from "./pages/login"; // ✅ NO lazy
import ProtectedRoute from "./routes/ProtectedRoute";

import RouteFallback from "./components/RouteFallback"; // tu loader/blur

// ✅ Lazy SOLO en privadas (pesadas)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analisis = lazy(() => import("./pages/analisis"));
const Comunidades = lazy(() => import("./pages/comunidades"));
const CodigoAcceso = lazy(() => import("./pages/codigocmu"));
const Reportes = lazy(() => import("./pages/reportes"));
const Usuarios = lazy(() => import("./pages/usuarios"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas (sin Suspense para evitar movimiento) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Privadas (con Suspense) */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/analisis"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Analisis />
              </Suspense>
            }
          />
          <Route
            path="/comunidades"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Comunidades />
              </Suspense>
            }
          />
          <Route
            path="/codigo-acceso"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CodigoAcceso />
              </Suspense>
            }
          />
          <Route
            path="/reportes"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Reportes />
              </Suspense>
            }
          />
          <Route
            path="/usuarios"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Usuarios />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
