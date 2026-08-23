import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getRoleDashboardRoute } from "@/utils/authRedirect";

export const PublicRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Avoid flashing login page during startup auth check
  }

  if (isAuthenticated && user) {
    const targetRoute = getRoleDashboardRoute(user.role, user.status);
    return <Navigate to={targetRoute} replace />;
  }

  return <Outlet />;
};
