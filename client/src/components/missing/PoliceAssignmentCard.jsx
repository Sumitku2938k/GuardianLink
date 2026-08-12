import React from "react";
import { Shield, PhoneCall, CheckCircle2, Clock, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const PoliceAssignmentCard = ({ caseData }) => {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 text-white shadow-xl space-y-4 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Official Law Enforcement Assignment</h4>
            <span className="text-[10px] text-teal-300 font-mono">Status: {caseData.policeStatus}</span>
          </div>
        </div>

        <Badge variant="secondary" size="sm" className="bg-teal-500/20 text-teal-300 border-teal-500/30 font-bold">
          {caseData.policeAssigned ? "Assigned" : "Awaiting Review"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Station</span>
          <strong className="text-white text-sm block mt-0.5">{caseData.policeStationName}</strong>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Investigating Officer</span>
          <strong className="text-teal-300 text-sm block mt-0.5">
            {caseData.policeOfficerName} {caseData.policeBadgeNumber ? `(${caseData.policeBadgeNumber})` : ""}
          </strong>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
        <span className="text-slate-400 block text-[10px] font-bold uppercase">Latest Official Update</span>
        <p className="text-slate-200 leading-relaxed text-[11px]">
          "{caseData.policeLastUpdate}"
        </p>
      </div>

      <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 border-t border-slate-800">
        <span>Assigned: {caseData.policeAssignedTime}</span>
        <a href={`tel:${caseData.policeContact || "112"}`} className="text-teal-300 font-bold hover:underline flex items-center gap-1">
          <PhoneCall className="w-3 h-3" /> Call Desk ({caseData.policeContact || "112"})
        </a>
      </div>
    </div>
  );
};
