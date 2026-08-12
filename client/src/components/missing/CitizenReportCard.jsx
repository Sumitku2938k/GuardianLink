import React from "react";
import { UserCheck, MapPin, Clock, Eye, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const CitizenReportCard = ({ report }) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">{report.reporterTag}</h4>
            <span className="text-[10px] text-gray-400 font-mono">{report.sightingTime}</span>
          </div>
        </div>

        <Badge variant="secondary" size="sm" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-semibold">
          {report.verificationState}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {report.photoPreview && (
          <img
            src={report.photoPreview}
            alt="Sighting Preview"
            className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-slate-800 shrink-0"
          />
        )}

        <div className="space-y-1 text-xs flex-1">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span className="font-bold">{report.location}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">
            "{report.description}"
          </p>
        </div>
      </div>
    </div>
  );
};
