import React from "react";
import { useNavigate } from "react-router-dom";
import { HeartHandshake, Eye, MapPin, ShieldCheck } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CareStatusBadge } from "@/components/ngo/CareStatusBadge";
import { Button } from "@/components/ui/Button";

export default function NgoCasesList() {
  const navigate = useNavigate();
  const { childrenInCare } = useNgo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-teal-650 dark:text-teal-400 shrink-0" />
            <span>Active Cases Under NGO Care</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Monitor cases involving children currently receiving temporary shelter and care.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {childrenInCare.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-3 shadow-md">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-teal-650 dark:text-teal-300 text-xs">Case #{c.caseNumber}</span>
                <CareStatusBadge status={c.careStatus} />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Intake #{c.intakeId}</span>
            </div>

            <div className="flex items-start gap-4 text-xs">
              <img src={c.photo} alt={c.childReference} className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-150 dark:ring-slate-800 shrink-0" />
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-slate-805 dark:text-white">{c.childReference}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Police Lead: <strong>{c.assignedOfficer} ({c.policeStation})</strong>
                </p>
                <span className="text-[10px] text-teal-650 dark:text-teal-300 font-semibold block">Verification: {c.guardianVerificationStatus}</span>
              </div>

              <Button
                onClick={() => navigate(`/ngo/cases/${c.caseNumber}`)}
                variant="primary"
                size="sm"
                className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs"
                leftIcon={Eye}
              >
                View NGO Case
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
