import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Users, FolderOpen, Building2, FileText, History, ChevronRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

export const AdminSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { users, adminCases, organizations, adminReports, auditLogs } = useAdmin();
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const matchingUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.id.toLowerCase().includes(query.toLowerCase())
  );

  const matchingCases = adminCases.filter(
    (c) =>
      c.childReference.toLowerCase().includes(query.toLowerCase()) ||
      c.id.toLowerCase().includes(query.toLowerCase())
  );

  const matchingOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.id.toLowerCase().includes(query.toLowerCase())
  );

  const matchingReports = adminReports.filter(
    (r) =>
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-150 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Users, Cases (MC-2026-8821), Organizations, Reports..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 outline-none text-sm font-semibold"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results Container */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {query.trim() === "" ? (
            <div className="text-center py-10 text-slate-400 font-mono">
              Search across authorized platform entities: Users, Cases, Organizations, Reports, and Audit events...
            </div>
          ) : (
            <>
              {/* Users Results */}
              {matchingUsers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Users ({matchingUsers.length})
                  </span>
                  {matchingUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        onClose();
                        navigate(`/admin/users/${u.id}`);
                      }}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-gray-150 hover:border-indigo-200 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div>
                          <strong className="text-slate-900 font-bold">{u.name}</strong>
                          <span className="text-slate-500 block text-[11px]">
                            {u.role} • {u.email}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                        User
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cases Results */}
              {matchingCases.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-600" /> Cases ({matchingCases.length})
                  </span>
                  {matchingCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onClose();
                        navigate(`/admin/cases/${c.id}`);
                      }}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-gray-150 hover:border-indigo-200 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <strong className="text-indigo-600 font-mono font-bold text-[11px] block">{c.id}</strong>
                        <span className="text-slate-900 font-bold text-xs">{c.childReference}</span>
                        <span className="text-slate-500 block text-[10px]">{c.policeStation}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                        Case
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Organizations Results */}
              {matchingOrgs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Organizations ({matchingOrgs.length})
                  </span>
                  {matchingOrgs.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        onClose();
                        navigate(`/admin/organizations/${o.id}`);
                      }}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-gray-150 hover:border-indigo-200 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <strong className="text-slate-900 font-bold text-xs">{o.name}</strong>
                        <span className="text-slate-500 block text-[10px]">
                          {o.type} • {o.location}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Org
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
