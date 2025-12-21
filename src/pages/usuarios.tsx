// src/pages/Usuarios.tsx
import "../styles/usuario.css";

import logoSafeZone from "../assets/logo-safe-zone.png";
import iconDashboard from "../assets/dashboard.svg";
import iconUsuario from "../assets/iconusuario.svg";
import iconComu from "../assets/icon_comu.svg";
import iconRepo from "../assets/icon_repo.svg";
import iconIa from "../assets/icon_ia.svg";
import iconAcceso from "../assets/icon_acceso.svg";

import iconImagen from "../assets/icon_imagen.svg";
import iconEdit from "../assets/icon_edit.svg";
import iconEliminar from "../assets/icon_eliminar.svg";

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, type ChangeEvent } from "react";

import {
  usuarioService,
  type UsuarioApi,
} from "../services/Usuario.Service";

type EstadoUsuario = "Activo" | "Suspendido";

type UsuarioUI = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  comunidad: string;
  rol: string;
  estado: EstadoUsuario;
  fecha: string;
  hora: string;
  fotoUrl?: string;
};

export default function Usuarios() {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioUI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 Cargar usuarios desde el backend al montar el componente
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        setError(null);

        const data: UsuarioApi[] = await usuarioService.getUsuarios();

        const usuariosTransformados: UsuarioUI[] = data.map((u) => {
          // fechaRegistro -> fecha y hora
          let fecha = "";
          let hora = "";
          if (u.fechaRegistro) {
            const [f, hFull] = u.fechaRegistro.split("T");
            fecha = f ?? "";
            if (hFull) {
              hora = hFull.substring(0, 5); // hh:mm
            }
          }

          return {
            id: u.id,
            nombre: `${u.nombre} ${u.apellido ?? ""}`.trim(),
            email: u.email,
            telefono: u.telefono ?? "",
            comunidad: "—", // aún no tienes campo comunidad en el backend
            rol: u.id === 1 ? "Administrador" : "Usuario",
            estado: u.activo ? "Activo" : "Suspendido",
            fecha,
            hora,
            fotoUrl: u.fotoUrl,
          };
        });

        setUsuarios(usuariosTransformados);
      } catch (err) {
        console.error("Error cargando usuarios", err);
        setError("No se pudieron cargar los usuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const handleLogout = () => {
    // aquí luego limpias token / sesión
    navigate("/login");
  };

  const handleChangeBusqueda = (e: ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const term = busqueda.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(term) ||
      u.comunidad.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="background" />

      <div className="dashboard">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img
              src={logoSafeZone}
              alt="SafeZone"
              className="sidebar-logo"
            />
            <div className="sidebar-title">SafeZone Admin</div>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className="sidebar-item">
              <img
                src={iconDashboard}
                className="nav-icon"
                alt="Dashboard"
              />
              <span>Dashboard</span>
            </Link>

            <Link to="/usuarios" className="sidebar-item active">
              <img src={iconUsuario} alt="Usuarios" />
              <span>Usuarios</span>
            </Link>

            <Link to="/comunidades" className="sidebar-item">
              <img src={iconComu} alt="Comunidades" />
              <span>Comunidades</span>
            </Link>

            <Link to="/reportes" className="sidebar-item">
              <img src={iconRepo} alt="Reportes" />
              <span>Reportes</span>
            </Link>

            <Link to="/analisis" className="sidebar-item">
              <img src={iconIa} alt="IA Análisis" />
              <span>IA Análisis</span>
            </Link>

            <Link to="/codigo-acceso" className="sidebar-item">
              <img src={iconAcceso} alt="Código Acceso" />
              <span>Código Acceso</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <button
              id="btnSalir"
              className="sidebar-logout"
              onClick={handleLogout}
            >
              Salir
            </button>
            <span className="sidebar-version">v1.0 - SafeZone</span>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="usuarios-main">
          <div className="usuario-panel">
            <h1 className="usuarios-title">Usuarios</h1>

            {/* Buscador */}
            <div className="usuarios-search">
              <input
                type="text"
                placeholder="Buscar por nombre o comunidad..."
                className="usuarios-search-input"
                value={busqueda}
                onChange={handleChangeBusqueda}
              />
            </div>

            {/* Estados de carga / error */}
            {loading && (
              <p style={{ color: "#fff", marginTop: "10px" }}>
                Cargando usuarios...
              </p>
            )}

            {error && !loading && (
              <p style={{ color: "#f97373", marginTop: "10px" }}>{error}</p>
            )}

            {/* Tarjeta grande glass con tabla */}
            {!loading && (
              <section className="usuarios-card">
                <div className="usuarios-card-inner">
                  <table className="usuarios-table">
                    <thead>
                      <tr>
                        <th>Foto</th>
                        <th>Nombre</th>
                        <th>Correo electrónico</th>
                        <th>Teléfono</th>
                        <th>Comunidad</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Último acceso</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map((u) => (
                        <tr key={u.id}>
                          <td>
                            {u.fotoUrl ? (
                              <img
                                src={u.fotoUrl}
                                alt="foto"
                                className="user-photo-icon"
                                style={{
                                  borderRadius: "999px",
                                  width: "26px",
                                  height: "26px",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <img
                                src={iconImagen}
                                alt="foto"
                                className="user-photo-icon"
                              />
                            )}
                          </td>
                          <td>{u.nombre}</td>
                          <td>{u.email}</td>
                          <td>{u.telefono}</td>
                          <td>{u.comunidad}</td>
                          <td>{u.rol}</td>
                          <td>
                            <span
                              className={
                                u.estado === "Activo"
                                  ? "badge badge-success"
                                  : "badge badge-danger"
                              }
                            >
                              {u.estado}
                            </span>
                          </td>
                          <td>
                            <span>{u.fecha}</span>
                            <br />
                            <span className="time">{u.hora}</span>
                          </td>
                          <td className="acciones">
                            {/*<button className="icon-button">
                              <img src={iconEdit} alt="Editar" />
                            </button>*/}
                            <button className="icon-button">
                              <img src={iconEliminar} alt="Eliminar" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {usuariosFiltrados.length === 0 && !loading && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: "center" }}>
                            No se encontraron usuarios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <p className="usuarios-update">
              Última actualización: {new Date().toLocaleString()}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
