import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MapPin, Clock, ShieldCheck, Search, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { ReportStatusBadge } from "@/components/citizen/ReportStatusBadge";
import { Button } from "@/components/ui/Button";

export default function PoliceFoundReports() {
  const navigate = useNavigate();
  const { foundReports, policeCases, updateCaseStatus } = usePolice();

  const safeFoundReports = Array.isArray(foundReports) ? foundReports : [];
  const safePoliceCases = Array.isArray(policeCases) ? policeCases : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [linkedCaseId, setLinkedCaseId] = useState(safePoliceCases[0]?.id || "");

  const handleLinkReport = (report) => {
    updateCaseStatus(linkedCaseId, "Investigating");
    alert(`Report #${report.reportNumber} linked to Case #${linkedCaseId} successfully.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400 shrink-0" />
            <span>Citizen Found Child Reports Queue</span>
          </h1>
          <p className="text-xs text-slate-400">Review sighting reports submitted by citizen helpers.</p>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="space-y-4">
        {safeFoundReports.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-mono text-xs">
            No citizen found child reports currently in queue.
          </div>
        ) : safeFoundReports.map((report) => (
          <div key={report.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-teal-300 text-xs">#{report.reportNumber}</span>
                <ReportStatusBadge status={report.status} />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{report.date}</span>
            </div>

            <div className="flex items-start gap-4 text-xs">
              {report.photo && (
                <img src={report.photo} alt="Report Photo" className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-800 shrink-0" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1 text-white font-bold">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> {report.location}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Approx Age: {report.approxAge} • Clothing: {report.clothing}
                </p>
                <span className="text-[10px] text-emerald-400 font-bold block">Safety State: {report.safetyState}</span>
              </div>
            </div>

            {/* Link Report to Active Case Action */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-400 font-mono text-[10px]">Link to Case:</span>
                <select
                  value={linkedCaseId}
                  onChange={(e) => setLinkedCaseId(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none"
                >
                  {policeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.caseNumber} ({c.childName})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => handleLinkReport(report)}
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                leftIcon={LinkIcon}
              >
                Link Report to Case
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
