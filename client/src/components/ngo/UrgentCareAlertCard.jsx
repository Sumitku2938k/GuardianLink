import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, HeartPulse, ShieldCheck, ArrowRight, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const UrgentCareAlertCard = ({ childrenInCare }) => {
  const urgentChildren = childrenInCare.filter(
    (c) => c.medicalStatus === "Medical Attention Required" || c.careStatus === "Awaiting Verification" || c.careStatus === "Reunification Pending"
  );

  if (urgentChildren.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 sm:p-6 text-slate-850 dark:text-white space-y-4 shadow-md">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-650 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Urgent Care & Coordination Alerts</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{urgentChildren.length} Children Require Care Action</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {urgentChildren.map((c) => (
          <div key={c.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={c.photo} alt={c.childReference} className="w-14 h-14 rounded-xl object-cover ring-2 ring-teal-500/30 shrink-0" />
              <div className="space-y-0.5 text-xs">
                <strong className="text-slate-800 dark:text-white font-bold block">{c.childReference}</strong>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Intake #{c.intakeId}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-1">
                  Alert: {c.medicalStatus === "Medical Attention Required" ? "Medical Attention Needed" : c.careStatus}
                </span>
              </div>
            </div>

            <Link to={`/ngo/children/${c.id}`}>
              <Button variant="primary" size="sm" className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs" rightIcon={ArrowRight}>
                Review Care
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
