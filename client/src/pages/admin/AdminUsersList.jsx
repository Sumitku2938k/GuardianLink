import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Shield,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  ShieldAlert,
  RefreshCw,
  Building2,
  MapPin,
  Clock
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { UserRoleModal } from "@/components/admin/UserRoleModal";
import { UserSuspendModal } from "@/components/admin/UserSuspendModal";
import { UserRejectModal } from "@/components/admin/UserRejectModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminUsersList() {
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

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("all");

  // Modals state
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [selectedUserForSuspend, setSelectedUserForSuspend] = useState(null);
  const [selectedUserForReject, setSelectedUserForReject] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const pendingCount = users.filter((u) => u.verificationStatus === "Pending").length;
  const policeCount = users.filter((u) => u.role === "Police").length;
  const ngoCount = users.filter((u) => u.role === "NGO").length;
  const rejectedCount = users.filter((u) => u.verificationStatus === "Rejected").length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.organization && u.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tab filter
    if (activeTab === "pending" && u.verificationStatus !== "Pending") return false;
    if (activeTab === "police" && u.role !== "Police") return false;
    if (activeTab === "ngo" && u.role !== "NGO") return false;
    if (activeTab === "rejected" && u.verificationStatus !== "Rejected") return false;

    // Dropdown filters
    const matchesRole = roleFilter === "All" || u.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "All" ||
      u.accountStatus.toLowerCase() === statusFilter.toLowerCase() ||
      u.verificationStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  const onApprove = async (userId) => {
    setActionInProgressId(userId);
    try {
      await handleApproveUser(userId);
    } catch (err) {
      alert("Failed to approve user: " + (err.response?.data?.message || err.message));
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>User Management & Verification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee registrations, approve pending Police and NGO accounts, and manage system security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchUsers && fetchUsers()}
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            disabled={isLoadingUsers}
            className={isLoadingUsers ? "opacity-75" : ""}
          >
            {isLoadingUsers ? "Syncing..." : "Refresh Users"}
          </Button>
        </div>
      </div>

      {/* USER STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Platform Users</span>
          <strong className="text-slate-900 text-lg font-black block mt-0.5">{users.length}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <span className="text-amber-700 block text-[10px] uppercase font-mono font-bold">
            Pending Verifications
          </span>
          <strong className="text-amber-800 text-lg font-black block mt-0.5">{pendingCount}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Police Officers</span>
          <strong className="text-blue-600 text-lg font-black block mt-0.5">{policeCount}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">NGO Shelters</span>
          <strong className="text-purple-600 text-lg font-black block mt-0.5">{ngoCount}</strong>
        </div>
      </div>

      {/* QUICK FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approvals ({pendingCount})</span>
        </button>
        <button
          onClick={() => setActiveTab("police")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "police"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Police ({policeCount})
        </button>
        <button
          onClick={() => setActiveTab("ngo")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "ngo"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          NGOs ({ngoCount})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "rejected"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Email, Organization, or City..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Parent">Parent</option>
            <option value="Citizen">Citizen</option>
            <option value="Police">Police</option>
            <option value="NGO">NGO</option>
            <option value="Admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending Approval</option>
            <option value="Verified">Verified / Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW / MOBILE CARDS */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">User / Organization Details</th>
              <th className="py-3.5 px-4 font-bold">Role</th>
              <th className="py-3.5 px-4 font-bold">Verification Status</th>
              <th className="py-3.5 px-4 font-bold">Account Access</th>
              <th className="py-3.5 px-4 font-bold">Registered</th>
              <th className="py-3.5 px-4 font-bold text-right">Verification & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  No registered users match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isPending = u.verificationStatus === "Pending";
                const isBusy = actionInProgressId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                        />
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs">{u.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {u.email} • {u.phone}
                          </span>
                          {u.organization && (
                            <span className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 shrink-0" />
                              {u.organization}
                            </span>
                          )}
                          {(u.city || u.state) && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              {[u.city, u.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          u.role === "Police"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : u.role === "NGO"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : u.role === "Admin"
                            ? "bg-slate-900 text-white"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.verificationStatus === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : u.verificationStatus === "Pending"
                            ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {u.verificationStatus}
                      </span>
                      {u.rejectionReason && u.verificationStatus === "Rejected" && (
                        <span className="text-[10px] text-rose-600 block mt-0.5 truncate max-w-[140px]" title={u.rejectionReason}>
                          {u.rejectionReason}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.accountStatus === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.accountStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {u.registeredDate}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {isPending ? (
                        <>
                          <Button
                            onClick={() => onApprove(u.id)}
                            variant="primary"
                            size="sm"
                            disabled={isBusy}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                            leftIcon={CheckCircle2}
                          >
                            {isBusy ? "Approving..." : "Approve"}
                          </Button>

                          <Button
                            onClick={() => setSelectedUserForReject(u)}
                            variant="danger"
                            size="sm"
                            disabled={isBusy}
                            className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            leftIcon={XCircle}
                          >
                            Reject
                          </Button>

                          <Button
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            leftIcon={Eye}
                          >
                            Details
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            leftIcon={Eye}
                          >
                            Profile
                          </Button>

                          <Button
                            onClick={() => setSelectedUserForRole(u)}
                            variant="outline"
                            size="sm"
                            className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            leftIcon={Edit2}
                          >
                            Role
                          </Button>

                          {u.accountStatus === "Active" ? (
                            <Button
                              onClick={() => setSelectedUserForSuspend(u)}
                              variant="danger"
                              size="sm"
                              className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleActivateUser(u.id)}
                              variant="primary"
                              size="sm"
                              className="text-xs bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                            >
                              Activate
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Role Change Modal */}
      {selectedUserForRole && (
        <UserRoleModal
          isOpen={!!selectedUserForRole}
          onClose={() => setSelectedUserForRole(null)}
          user={selectedUserForRole}
          onConfirmRoleChange={(uId, newRole) => handleUpdateUserRole(uId, newRole)}
        />
      )}

      {/* Suspend Account Modal */}
      {selectedUserForSuspend && (
        <UserSuspendModal
          isOpen={!!selectedUserForSuspend}
          onClose={() => setSelectedUserForSuspend(null)}
          user={selectedUserForSuspend}
          onConfirmSuspend={(uId, reason) => handleSuspendUser(uId, reason)}
        />
      )}

      {/* Reject Application Modal */}
      {selectedUserForReject && (
        <UserRejectModal
          isOpen={!!selectedUserForReject}
          onClose={() => setSelectedUserForReject(null)}
          user={selectedUserForReject}
          onConfirmReject={(uId, reason) => handleRejectUser(uId, reason)}
        />
      )}
    </div>
  );
}
