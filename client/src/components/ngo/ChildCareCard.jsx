import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Clock, Heart, Building2, ChevronRight } from "lucide-react";
import { CareStatusBadge } from "./CareStatusBadge";
import { MedicalStatusBadge } from "./MedicalStatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const ChildCareCard = ({ child }) => {
  const navigate = useNavigate();

  return (
    <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md hover:border-teal-500/40 transition-colors">
      <div className="flex items-center gap-3.5">
        <img
          src={child.photo}
          alt={child.childReference}
          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-500/30 shrink-0"
        />
        <div className="space-y-0.5 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{child.childReference}</h4>
            <span className="text-[10px] font-mono font-bold text-teal-650 dark:text-teal-400">#{child.intakeId}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Approx {child.approxAge} yrs • {child.gender}</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CareStatusBadge status={child.careStatus} />
            <MedicalStatusBadge status={child.medicalStatus} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-slate-950 rounded-xl text-xs border border-gray-150 dark:border-slate-800">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Time in Shelter</span>
          <strong className="text-slate-850 dark:text-white block mt-0.5">{child.timeInShelter}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Case Number</span>
          <strong className="text-teal-600 dark:text-teal-300 font-mono block mt-0.5">{child.caseNumber}</strong>
        </div>
      </div>

      <div className="pt-1 flex justify-between items-center text-xs">
        <span className="text-[10px] text-slate-550 dark:text-slate-400">Assigned: {child.assignedDorm}</span>
        <Button
          onClick={() => navigate(`/ngo/children/${child.id}`)}
          variant="primary"
          size="sm"
          className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs"
          leftIcon={Eye}
        >
          View Care Profile
        </Button>
      </div>
    </Card>
  );
};
