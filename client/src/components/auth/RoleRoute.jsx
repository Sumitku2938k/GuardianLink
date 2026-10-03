import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";

export const RoleRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <span className="text-xs font-mono font-bold text-slate-600">Verifying Role Permissions...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || "").toLowerCase().trim();
  const userStatus = (user.status || "").toLowerCase().trim();

  // If user account is suspended or deactivated, block access
  if (userStatus === "suspended" || userStatus === "deactivated") {
    return <Navigate to="/login" replace />;
  }

  // Pending or rejected Police / NGO account cannot access operational dashboards
  if ((userStatus === "pending" || userStatus === "rejected") && (userRole === "police" || userRole === "ngo")) {
    return <Navigate to="/verification-pending" replace />;
  }

  // Check if role is authorized
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

  if (!normalizedAllowed.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
