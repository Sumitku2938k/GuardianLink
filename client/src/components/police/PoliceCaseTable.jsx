import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, MapPin, Clock, UserCheck, ShieldAlert } from "lucide-react";
import { CaseStatusBadge } from "@/components/missing/CaseStatusBadge";
import { CasePriorityBadge } from "@/components/missing/CasePriorityBadge";
import { Button } from "@/components/ui/Button";

export const PoliceCaseTable = ({ cases }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-bold">Priority</th>
            <th className="py-3.5 px-4 font-bold">Case ID</th>
            <th className="py-3.5 px-4 font-bold">Child Profile</th>
            <th className="py-3.5 px-4 font-bold">Last Seen Area</th>
            <th className="py-3.5 px-4 font-bold">Reported Time</th>
            <th className="py-3.5 px-4 font-bold">Status</th>
            <th className="py-3.5 px-4 font-bold">Assigned Officer</th>
            <th className="py-3.5 px-4 font-bold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
              <td className="py-3.5 px-4">
                <CasePriorityBadge priority={c.priority} />
              </td>

              <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                {c.caseNumber}
              </td>

              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src={c.childPhoto}
                    alt={c.childName}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-700 shrink-0"
                  />
                  <div>
                    <strong className="text-white block font-bold text-xs">{c.childName}</strong>
                    <span className="text-[10px] text-slate-400">{c.childAge} yrs • {c.childGender}</span>
                  </div>
                </div>
              </td>

              <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{c.lastSeenLocation}</span>
                </span>
              </td>

              <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                {c.createdAt}
              </td>

              <td className="py-3.5 px-4">
                <CaseStatusBadge status={c.status} />
              </td>

              <td className="py-3.5 px-4 font-semibold text-slate-200">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{c.assignedOfficerName || "Unassigned"}</span>
                </div>
              </td>

              <td className="py-3.5 px-4 text-right">
                <Button
                  onClick={() => navigate(`/police/cases/${c.id}`)}
                  variant="primary"
                  size="sm"
                  leftIcon={Eye}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  View Case
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
