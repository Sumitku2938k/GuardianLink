import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Eye, ShieldCheck, ChevronRight } from "lucide-react";
import { ReportStatusBadge } from "./ReportStatusBadge";
import { Button } from "@/components/ui/Button";

export const CitizenReportCard = ({ report }) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
            #{report.reportNumber}
          </span>
          <ReportStatusBadge status={report.status} />
        </div>

        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" /> {report.date}
        </span>
      </div>

      <div className="flex items-start gap-4">
        {report.photo && (
          <img
            src={report.photo}
            alt="Report Child"
            className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-slate-800 shrink-0"
          />
        )}

        <div className="space-y-1 text-xs flex-1">
          <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{report.location}</span>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-[11px] truncate">
            Approx Age: {report.approxAge} • Clothing: {report.clothing}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
              Safety State: {report.safetyState}
            </span>

            <Button
              onClick={() => navigate(`/citizen/reports/${report.id}`)}
              variant="ghost"
              size="sm"
              rightIcon={ChevronRight}
              className="text-xs text-primary font-bold hover:bg-transparent"
            >
              View Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
