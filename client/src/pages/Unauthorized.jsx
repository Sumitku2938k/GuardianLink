import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRoleDashboardRoute } from "@/utils/authRedirect";
import { Button } from "@/components/ui/Button";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoDashboard = () => {
    if (user) {
      navigate(getRoleDashboardRoute(user.role, user.status));
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center text-slate-800">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-lg shadow-rose-500/10">
        <ShieldAlert className="w-9 h-9" />
      </div>

      <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-widest block mb-1">
        403 Access Restricted
      </span>

      <h1 className="text-3xl font-black text-slate-900 tracking-tight max-w-md">
        You Don't Have Permission to Access This Area
      </h1>

      <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
        GuardianLink operates under strict least-privilege security. Your account role ({user?.role || "Guest"}) does not have administrative clearance for this section.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button
          onClick={handleGoDashboard}
          variant="primary"
          size="sm"
          className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          leftIcon={LayoutDashboard}
        >
          Go to My Authorized Dashboard
        </Button>

        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="sm"
          leftIcon={Home}
        >
          Return Home
        </Button>
      </div>
    </div>
  );
}
