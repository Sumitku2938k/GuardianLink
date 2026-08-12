import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert, MapPin, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { CasePriorityBadge } from "./CasePriorityBadge";
import { Button } from "@/components/ui/Button";

export const ActiveCaseBanner = ({ activeCase }) => {
  if (!activeCase) return null;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-2 border-rose-500/50 p-6 shadow-2xl text-white">
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={activeCase.childPhoto}
              alt={activeCase.childName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-rose-500/40 shadow-xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1 rounded-full ring-2 ring-slate-900 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 animate-pulse" /> Active Missing Case
              </span>
              <CaseStatusBadge status={activeCase.status} />
              <CasePriorityBadge priority={activeCase.priority} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeCase.childName} <span className="text-xs font-mono font-normal text-slate-300">({activeCase.caseNumber})</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {activeCase.lastSeenLocation}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Reported: {activeCase.createdAt}</span>
            </div>

            <p className="text-xs text-slate-300 pt-1">
              Assigned Authority: <strong className="text-teal-300">{activeCase.policeStationName}</strong>
            </p>
          </div>
        </div>

        <div className="w-full lg:w-auto shrink-0 flex items-center justify-end">
          <Link to={`/parent/missing-cases/${activeCase.id}`} className="w-full sm:w-auto">
            <Button
              variant="destructive"
              size="md"
              className="w-full justify-center shadow-lg shadow-rose-600/30 py-3"
              rightIcon={ArrowRight}
            >
              View Active Case Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
