import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, Filter, ShieldCheck, CheckCircle2, Eye, Building } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { OrgVerificationModal } from "@/components/admin/OrgVerificationModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminOrgsList() {
  const navigate = useNavigate();
  const { organizations, handleVerifyOrganization } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrgForVerification, setSelectedOrgForVerification] = useState(null);

  const filteredOrgs = organizations.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "All" || o.type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === "All" || o.verificationStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Organization Management & Verification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee police station posts, NGO child shelters, registration licensing, and staff credentials.
          </p>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Organizations</span>
          <strong className="text-slate-900 text-lg font-black block mt-0.5">{organizations.length}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Verified Police Posts</span>
          <strong className="text-blue-600 text-lg font-black block mt-0.5">
            {organizations.filter((o) => o.type === "Police" && o.verificationStatus === "Verified").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Verified NGO Shelters</span>
          <strong className="text-teal-600 text-lg font-black block mt-0.5">
            {organizations.filter((o) => o.type === "NGO" && o.verificationStatus === "Verified").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Pending Verification</span>
          <strong className="text-amber-600 text-lg font-black block mt-0.5">
            {organizations.filter((o) => o.verificationStatus === "Pending").length}
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
            placeholder="Search Organization Name, Location, or Org ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Types</option>
            <option value="Police">Police Posts</option>
            <option value="NGO">NGO Shelters</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">Organization</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Location</th>
              <th className="py-3.5 px-4 font-bold">Verification</th>
              <th className="py-3.5 px-4 font-bold">Members</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredOrgs.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-slate-900 block font-bold text-xs">{o.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">Contact: {o.contactPerson} • {o.id}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${o.type === "Police" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-teal-50 text-teal-700 border border-teal-100"}`}>
                    {o.type}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-600">
                  {o.location}
                </td>

                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      o.verificationStatus === "Verified"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {o.verificationStatus}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                  {o.membersCount} Members
                </td>

                <td className="py-3.5 px-4 text-right space-x-1.5">
                  <Button
                    onClick={() => navigate(`/admin/organizations/${o.id}`)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    leftIcon={Eye}
                  >
                    Details
                  </Button>

                  <Button
                    onClick={() => setSelectedOrgForVerification(o)}
                    variant="primary"
                    size="sm"
                    className="text-xs bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    leftIcon={ShieldCheck}
                  >
                    Verify Workflow
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {selectedOrgForVerification && (
        <OrgVerificationModal
          isOpen={!!selectedOrgForVerification}
          onClose={() => setSelectedOrgForVerification(null)}
          org={selectedOrgForVerification}
          onConfirmDecision={(oId, dec) => handleVerifyOrganization(oId, dec)}
        />
      )}
    </div>
  );
}
