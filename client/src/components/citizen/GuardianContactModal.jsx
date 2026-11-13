import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertTriangle, FileText, PhoneCall, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const GuardianContactModal = ({
  isOpen,
  onClose,
  candidate,
  requestSent,
  requestStatus,
  onRequestSend
}) => {
  const navigate = useNavigate();

  if (!candidate) return null;

  const handleFileReport = () => {
    onClose();
    navigate("/citizen/found-child/report", {
      state: { candidate, caseId: candidate.caseId || candidate.id }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <ShieldCheck className="w-6 h-6" />
          <span>Official Law Enforcement & Child Welfare Protocol</span>
        </div>
      }
      subtitle={`Case #${candidate.caseNumber || "ACTIVE"} — ${candidate.childName || "Potential Lead"}`}
      maxWidth="max-w-md"
    >
      {!requestSent ? (
        <div className="space-y-5 py-2">
          {/* Legal Protocol Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-[11px] uppercase tracking-wide">Legal Child Protection Mandate</strong>
              <p className="text-[11px] leading-relaxed">
                Under the Juvenile Justice Act, citizen helpers must never execute private or unverified physical handovers. All missing child reunifications are formally coordinated through investigating Police Officers and Child Welfare Committees (CWC).
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Dispatching an official verification request will alert the assigned Investigating Officers handling Case <strong>#{candidate.caseNumber}</strong> to evaluate this biometric lead and coordinate verified contact with the registered guardian.
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 space-y-2 border border-gray-100 dark:border-slate-800 text-xs">
            <span className="text-gray-400 block font-bold uppercase text-[10px]">What Happens Next</span>
            <div className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
              <div>1. Police desk receives priority notification with sighting lead.</div>
              <div>2. Officers verify lead against active case file and biometric match.</div>
              <div>3. Official police dispatch or shelter team coordinates secure custody.</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <Button
              variant="primary"
              size="sm"
              onClick={onRequestSend}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
            >
              Dispatch Official Police Alert
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileReport}
              leftIcon={FileText}
              className="w-full"
            >
              File Detailed Sighting Report Instead
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-xs text-gray-500">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 text-center py-4">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Law Enforcement Notified</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your sighting lead has been queued for the investigating unit handling Case #{candidate.caseNumber}.
              </p>
            </div>
            <Badge variant="secondary" size="sm" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
              Status: {requestStatus || "Pending Police Review"}
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-left space-y-2 border border-gray-100 dark:border-slate-800 text-xs">
            <strong className="text-slate-800 dark:text-slate-200 block text-[11px]">Emergency Direct Contact:</strong>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              If the child requires immediate medical care or you believe they are in imminent danger, contact emergency services immediately:
            </p>
            <div className="flex gap-2 pt-1">
              <a
                href="tel:1098"
                className="flex-1 py-2 px-3 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold text-center hover:bg-teal-500/20 text-xs flex items-center justify-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 1098 (Childline)
              </a>
              <a
                href="tel:112"
                className="flex-1 py-2 px-3 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-center hover:bg-blue-500/20 text-xs flex items-center justify-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 112 (Police)
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleFileReport}
              leftIcon={FileText}
              className="w-full bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              Add Full Sighting Report & Evidence
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="w-full text-xs">
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
