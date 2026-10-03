import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Edit2,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  RefreshCw
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { UserRoleModal } from "@/components/admin/UserRoleModal";
import { UserSuspendModal } from "@/components/admin/UserSuspendModal";
import { UserRejectModal } from "@/components/admin/UserRejectModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const {
    users,
    isLoadingUsers,
    fetchUsers,
    handleApproveUser,
    handleRejectUser,
    handleUpdateUserRole,
    handleSuspendUser,
    handleActivateUser
  } = useAdmin();

  useEffect(() => {
    if (fetchUsers) {
      fetchUsers();
    }
  }, []);

  const user = users.find((u) => u.id === userId);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  if (isLoadingUsers && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <span className="text-xs font-mono font-bold text-slate-500">Loading user profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-slate-800">User Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested user ID {userId} could not be located.</p>
        <Button onClick={() => navigate("/admin/users")} className="mt-4">
          Return to Users List
        </Button>
      </div>
    );
  }

  const isPending = user.verificationStatus === "Pending";

  const onApprove = async () => {
    setIsApproving(true);
    try {
      await handleApproveUser(user.id);
    } catch (err) {
      alert("Failed to approve user: " + (err.response?.data?.message || err.message));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")} leftIcon={ArrowLeft}>
          Back to Users List
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {isPending && (
            <>
              <Button
                onClick={onApprove}
                variant="primary"
                size="sm"
                disabled={isApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                leftIcon={CheckCircle2}
              >
                {isApproving ? "Approving..." : "Approve Application"}
              </Button>

              <Button
                onClick={() => setIsRejectModalOpen(true)}
                variant="danger"
                size="sm"
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                leftIcon={XCircle}
              >
                Reject Application
              </Button>
            </>
          )}

          <Button
            onClick={() => setIsRoleModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            leftIcon={Edit2}
          >
            Modify Role
          </Button>

          {user.accountStatus === "Active" ? (
            <Button
              onClick={() => setIsSuspendModalOpen(true)}
              variant="danger"
              size="sm"
              leftIcon={Lock}
            >
              Suspend Account
            </Button>
          ) : (
            <Button
              onClick={() => handleActivateUser(user.id)}
              variant="primary"
              size="sm"
              className="bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              Activate Account
            </Button>
          )}
        </div>
      </div>

      {/* USER PROFILE HEADER CARD */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {user.role}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    user.verificationStatus === "Verified"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : user.verificationStatus === "Pending"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {user.verificationStatus}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
              <span className="text-xs text-slate-500 font-mono block">{user.email} • ID: {user.id}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 text-xs space-y-1 sm:text-right w-full sm:w-auto">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Account Security Status</span>
            <strong className="text-emerald-700 font-bold block">{user.accountStatus} Access</strong>
            <span className="text-slate-500 text-[10px] block">Last Active: {user.lastActive}</span>
          </div>
        </div>

        {user.verificationStatus === "Rejected" && user.rejectionReason && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
            <strong className="text-rose-800 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Application Rejection Reason:
            </strong>
            <p className="text-rose-700">{user.rejectionReason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-gray-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Phone Contact</span>
            <strong className="text-slate-800 block mt-0.5">{user.phone}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Registration Date</span>
            <strong className="text-slate-800 block mt-0.5">{user.registeredDate}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Associated Organization</span>
            <strong className="text-indigo-700 block mt-0.5">{user.organization || "Independent Individual"}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Location</span>
            <strong className="text-slate-800 block mt-0.5">
              {[user.city, user.state].filter(Boolean).join(", ") || "Not Specified"}
            </strong>
          </div>
        </div>
      </Card>

      {/* SECURITY LOGS & RELATED ACTIVITY */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-gray-150 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <span>User Security & Access History</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
            <div>
              <strong className="text-slate-900 block font-bold">Registration Verification Status</strong>
              <span className="text-[10px] text-slate-500 font-mono">Current state: {user.verificationStatus}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{user.registeredDate}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
            <div>
              <strong className="text-slate-900 block font-bold">Account Access Standing</strong>
              <span className="text-[10px] text-slate-500 font-mono">Account state: {user.accountStatus}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{user.lastActive}</span>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <UserRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        user={user}
        onConfirmRoleChange={(uId, newRole) => handleUpdateUserRole(uId, newRole)}
      />

      <UserSuspendModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        user={user}
        onConfirmSuspend={(uId, reason) => handleSuspendUser(uId, reason)}
      />

      {isRejectModalOpen && (
        <UserRejectModal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          user={user}
          onConfirmReject={(uId, reason) => handleRejectUser(uId, reason)}
        />
      )}
    </div>
  );
}
