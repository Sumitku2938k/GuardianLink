import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ShieldCheck, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function VerificationPending() {
  const navigate = useNavigate();
  const { user, logout, checkAuthStatus } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center text-slate-800">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 border border-amber-200 shadow-lg shadow-amber-500/10">
        <Clock className="w-9 h-9 animate-pulse" />
      </div>

      <span className="text-xs font-mono font-bold text-amber-700 uppercase tracking-widest block mb-1">
        Official Verification Pending
      </span>

      <h1 className="text-3xl font-black text-slate-900 tracking-tight max-w-md">
        Account Awaiting Authority Approval
      </h1>

      <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
        Your registration as a <strong>{user?.role === "police" ? "Police Officer Escort" : "NGO Child Welfare Shelter"}</strong> account is currently under review by GuardianLink platform administrators.
      </p>

      <div className="p-4 bg-white rounded-2xl border border-gray-200 text-xs text-slate-500 max-w-md my-6 text-left space-y-1.5 shadow-sm">
        <strong className="text-slate-900 font-bold block">What happens next?</strong>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          1. Administrators verify your organization credentials and licensing documents.<br />
          2. Once approved, full operational case access will be granted automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => checkAuthStatus()}
          variant="outline"
          size="sm"
          leftIcon={RefreshCw}
        >
          Refresh Status
        </Button>

        <Button
          onClick={() => logout().then(() => navigate("/login"))}
          variant="primary"
          size="sm"
          className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          leftIcon={LogOut}
        >
          Logout Session
        </Button>
      </div>
    </div>
  );
}
