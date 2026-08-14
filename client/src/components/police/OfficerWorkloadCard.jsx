import React from "react";
import { UserCheck, Shield, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const OfficerWorkloadCard = ({ officer, onReassignClick }) => {
  return (
    <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-4 hover:border-blue-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={officer.avatar}
            alt={officer.name}
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/30 shrink-0"
          />
          <div>
            <h4 className="text-sm font-bold text-white">{officer.name}</h4>
            <span className="text-[10px] text-teal-400 font-mono block">{officer.badgeNumber} • {officer.rank}</span>
          </div>
        </div>

        <Badge variant={officer.availability === "Active Duty" ? "success" : "neutral"} size="sm">
          {officer.availability}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 text-center text-xs border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-400 font-mono block">Active Cases</span>
          <strong className="text-white text-sm font-bold block">{officer.activeCases}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-mono block">Critical</span>
          <strong className="text-rose-400 text-sm font-bold block">{officer.criticalCases}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-mono block">Resolved</span>
          <strong className="text-emerald-400 text-sm font-bold block">{officer.completedCases}</strong>
        </div>
      </div>

      <div className="pt-1 flex justify-end">
        <Button
          onClick={() => onReassignClick(officer)}
          variant="outline"
          size="sm"
          leftIcon={UserPlus}
          className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          Assign Case Load
        </Button>
      </div>
    </Card>
  );
};
