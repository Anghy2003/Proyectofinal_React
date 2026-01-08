import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "../services/auth.service";

export default function ProtectedRoute() {
  const location = useLocation();
  const session = authService.getSession();

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!session.rol || session.rol.toUpperCase() !== "ADMIN") {
    authService.logout();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
