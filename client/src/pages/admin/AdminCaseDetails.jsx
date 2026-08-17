import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FolderOpen, ArrowLeft, Lock, AlertTriangle, ShieldCheck, Cpu, UserCheck } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { adminCases, handleEscalateCase } = useAdmin();

  const c = adminCases.find((item) => item.id === caseId) || adminCases[0];
  const [noteText, setNoteText] = useState("");
  const [isEscalated, setIsEscalated] = useState(c?.priority === "Critical");

  if (!c) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-slate-800">Case Record Not Found</h3>
        <Button onClick={() => navigate("/admin/cases")} className="mt-4">
          Return to Cases
        </Button>
      </div>
    );
  }

  const handleEscalate = () => {
    handleEscalateCase(c.id, noteText || "Administrative priority escalation.");
    setIsEscalated(true);
  };

  return (
    <div className="space-y-6">
      {/* HEADER toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/cases")} leftIcon={ArrowLeft}>
          Back to Cases Oversight
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleEscalate}
            variant="danger"
            size="sm"
            isDisabled={isEscalated}
            leftIcon={AlertTriangle}
          >
            {isEscalated ? "Priority Escalated" : "Escalate Priority"}
          </Button>
        </div>
      </div>

      {/* VIEW ONLY RESPONSIBILITY NOTICE */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-sm font-bold">Administrative Oversight Mode (View Only)</strong>
          <p className="leading-relaxed text-[11px]">
            Platform administrators maintain system-wide oversight of case progress and audit trails. Police investigation logs, FIR evidentiary records, and identity match confirmations can only be modified by authorized law enforcement officers.
          </p>
        </div>
      </div>

      {/* CASE OVERVIEW HEADER */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={c.photo} alt={c.childReference} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-700">Case #{c.id}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${c.priority === "Critical" ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                  {c.priority} Priority
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{c.childReference}</h1>
              <span className="text-xs text-slate-500 font-mono block">Status: {c.status} • Match Confidence: {c.matchConfidence}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4 border-t border-gray-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Police Post</span>
            <strong className="text-slate-800 block mt-0.5">{c.policeStation}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">NGO Care Involvement</span>
            <strong className="text-teal-700 block mt-0.5">{c.ngoInvolved}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Case Registration Date</span>
            <strong className="text-slate-800 block mt-0.5">{c.createdDate}</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}
