import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, Heart, Building2, UserCheck } from "lucide-react";
import { CareStatusBadge } from "./CareStatusBadge";
import { MedicalStatusBadge } from "./MedicalStatusBadge";
import { Button } from "@/components/ui/Button";

export const ChildCareTable = ({ childrenList }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-bold">Child Reference</th>
            <th className="py-3.5 px-4 font-bold">Intake / Case #</th>
            <th className="py-3.5 px-4 font-bold">Time in Care</th>
            <th className="py-3.5 px-4 font-bold">Care Status</th>
            <th className="py-3.5 px-4 font-bold">Medical Status</th>
            <th className="py-3.5 px-4 font-bold">Guardian Status</th>
            <th className="py-3.5 px-4 font-bold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-150 dark:divide-slate-800/80">
          {childrenList.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-3">
                  <img src={c.photo} alt={c.childReference} className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-150 dark:ring-slate-800 shrink-0" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block font-bold text-xs">{c.childReference}</strong>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Approx {c.approxAge} yrs • {c.gender}</span>
                  </div>
                </div>
              </td>

              <td className="py-3.5 px-4 font-mono font-bold text-teal-650 dark:text-teal-400">
                <div>#{c.intakeId}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-450 font-normal">{c.caseNumber}</div>
              </td>

              <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {c.timeInShelter}
              </td>

              <td className="py-3.5 px-4">
                <CareStatusBadge status={c.careStatus} />
              </td>

              <td className="py-3.5 px-4">
                <MedicalStatusBadge status={c.medicalStatus} />
              </td>

              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                {c.guardianVerificationStatus}
              </td>

              <td className="py-3.5 px-4 text-right">
                <Button
                  onClick={() => navigate(`/ngo/children/${c.id}`)}
                  variant="primary"
                  size="sm"
                  leftIcon={Eye}
                  className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs"
                >
                  View Profile
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
