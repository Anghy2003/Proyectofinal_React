// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/HomeGenieNova";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Analisis from "./pages/analisis";
import Comunidades from "./pages/comunidades";
import CodigoAcceso from "./pages/codigocmu";
import Reportes from "./pages/reportes";
import Usuarios from "./pages/usuarios";

import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Home />} />

        {/* ✅ Login público SIEMPRE */}
        <Route path="/login" element={<Login />} />

        {/* Privadas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="/comunidades" element={<Comunidades />} />
          <Route path="/codigo-acceso" element={<CodigoAcceso />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>

        {/* Si no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
