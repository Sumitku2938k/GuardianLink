import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Filter, Shield, Lock, CheckCircle2, Eye, Edit2, ShieldAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { UserRoleModal } from "@/components/admin/UserRoleModal";
import { UserSuspendModal } from "@/components/admin/UserSuspendModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminUsersList() {
  const navigate = useNavigate();
  const { users, handleUpdateUserRole, handleSuspendUser, handleActivateUser } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [selectedUserForSuspend, setSelectedUserForSuspend] = useState(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || u.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === "All" || u.accountStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>User Management & Access Control</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registered users, platform roles, identity verifications, and account security.
          </p>
        </div>
      </div>

      {/* USER STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Platform Users</span>
          <strong className="text-slate-900 text-lg font-black block mt-0.5">{users.length}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Parents & Guardians</span>
          <strong className="text-indigo-600 text-lg font-black block mt-0.5">
            {users.filter((u) => u.role === "Parent").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Citizens & Volunteers</span>
          <strong className="text-teal-600 text-lg font-black block mt-0.5">
            {users.filter((u) => u.role === "Citizen").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Police & NGO Staff</span>
          <strong className="text-blue-600 text-lg font-black block mt-0.5">
            {users.filter((u) => u.role === "Police" || u.role === "NGO").length}
          </strong>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Email, or User ID..."
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
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW / MOBILE CARDS */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">User Details</th>
              <th className="py-3.5 px-4 font-bold">Role</th>
              <th className="py-3.5 px-4 font-bold">Verification</th>
              <th className="py-3.5 px-4 font-bold">Account Status</th>
              <th className="py-3.5 px-4 font-bold">Registered</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200" />
                    <div>
                      <strong className="text-slate-900 block font-bold text-xs">{u.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{u.email} • {u.id}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {u.role}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      u.verificationStatus === "Verified"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : u.verificationStatus === "Pending"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {u.verificationStatus}
                  </span>
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

                <td className="py-3.5 px-4 text-right space-x-1.5">
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
                </td>
              </tr>
            ))}
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
    </div>
  );
}
