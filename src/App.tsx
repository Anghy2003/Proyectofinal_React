// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";       
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Analisis from "./pages/analisis";
import Comunidades from "./pages/comunidades";
import CodigoAcceso from "./pages/codigocmu";
import Reportes from "./pages/reportes";
import Usuarios from "./pages/usuarios";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* INICIO = Home */}
        <Route path="/" element={<Home />} />

        {/* LOGIN EN /login */}
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analisis" element={<Analisis />} />
        <Route path="/comunidades" element={<Comunidades />} />
        <Route path="/codigo-acceso" element={<CodigoAcceso />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
