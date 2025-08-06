import { Navigate } from "react-router-dom";
import { LoginState } from "../lib/login";
import { DashboardLayout } from "./DashboardLayout";

export function ProtectedLayout() {
  const session = LoginState.snapshot();

  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/login" />;
  }

  return <DashboardLayout />;
}
