import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/auth.service";

export default function PublicRoute() {
  const session = authService.getSession();
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
