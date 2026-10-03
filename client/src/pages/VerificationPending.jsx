import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ShieldCheck, LogOut, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { getRoleDashboardRoute } from "@/utils/authRedirect";

export default function VerificationPending() {
  const navigate = useNavigate();
  const { user, logout, checkAuthStatus } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const status = (user?.status || "").toLowerCase().trim();
  const isRejected = status === "rejected";

  // Auto-redirect if status becomes approved or active
  useEffect(() => {
    if (user && (status === "approved" || status === "active")) {
      const targetRoute = getRoleDashboardRoute(user.role, user.status);
      navigate(targetRoute, { replace: true });
    }
  }, [user, status, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkAuthStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel =
    user?.role === "police"
      ? "Police Officer Escort"
      : user?.role === "ngo"
      ? "NGO Child Welfare Shelter"
      : "Organization Partner";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center text-slate-800">
      {isRejected ? (
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-lg shadow-rose-500/10">
          <XCircle className="w-9 h-9" />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 border border-amber-200 shadow-lg shadow-amber-500/10">
          <Clock className="w-9 h-9 animate-pulse" />
        </div>
      )}

      <span
        className={`text-xs font-mono font-bold uppercase tracking-widest block mb-1 ${
          isRejected ? "text-rose-600" : "text-amber-700"
        }`}
      >
        {isRejected ? "Registration Application Rejected" : "Official Verification Pending"}
      </span>

      <h1 className="text-3xl font-black text-slate-900 tracking-tight max-w-md">
        {isRejected ? "Application Under Review Rejected" : "Account Awaiting Authority Approval"}
      </h1>

      <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
        {isRejected ? (
          <>
            Your registration request for a <strong>{roleLabel}</strong> account was reviewed and could not be approved at this time.
          </>
        ) : (
          <>
            Your registration as a <strong>{roleLabel}</strong> account is currently under review by GuardianLink platform administrators.
          </>
        )}
      </p>

      {isRejected ? (
        <div className="p-4 bg-white rounded-2xl border border-rose-200 text-xs text-slate-700 max-w-md my-6 text-left space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Reason for Decision</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
            {user?.rejectionReason || "Organization credentials or licensing documents could not be verified by platform administrators."}
          </p>
          <span className="text-[11px] text-slate-500 block pt-1">
            If you believe this is an error or wish to appeal, please contact platform administration with your credentials.
          </span>
        </div>
      ) : (
        <div className="p-4 bg-white rounded-2xl border border-gray-200 text-xs text-slate-500 max-w-md my-6 text-left space-y-1.5 shadow-sm">
          <strong className="text-slate-900 font-bold block">What happens next?</strong>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            1. Administrators verify your organization credentials, badges, or shelter licensing.<br />
            2. Once approved, full operational access to the platform will be granted immediately.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isRejected && (
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            leftIcon={RefreshCw}
            className={isRefreshing ? "opacity-75" : ""}
          >
            {isRefreshing ? "Checking..." : "Refresh Status"}
          </Button>
        )}

        <Button
          onClick={handleLogout}
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
