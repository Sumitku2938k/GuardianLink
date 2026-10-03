import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getRoleDashboardRoute } from "@/utils/authRedirect";

export const PublicRoute = () => {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();

  // Wait until authentication initialization finishes to avoid premature redirects or resetting forms
  if (!isInitialized || isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    const targetRoute = getRoleDashboardRoute(user.role, user.status);
    return <Navigate to={targetRoute} replace />;
  }

  return <Outlet />;
};
