import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, FileSearch, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const MatchVerificationModal = ({ isOpen, onClose, match, onConfirmDecision }) => {
  const [decision, setDecision] = useState("confirm"); // 'confirm' | 'reject' | 'request_evidence'
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onConfirmDecision(match.id, decision, notes);
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-blue-400">
          <ShieldCheck className="w-6 h-6" />
          <span>Officer AI Match Verification Decision</span>
        </div>
      }
      subtitle={`Case #${match.caseId} • Vector Score: ${match.confidenceScore}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <p className="text-slate-300 leading-relaxed">
          Please select your formal decision regarding the AI facial candidate match for this case.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block">
            Verification Decision
          </label>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setDecision("confirm")}
              className={`w-full p-3 rounded-xl border font-bold text-xs text-left transition-all flex items-center gap-2.5 ${
                decision === "confirm"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Confirm Identity (Mark Child as Found / Reunification)</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision("reject")}
              className={`w-full p-3 rounded-xl border font-bold text-xs text-left transition-all flex items-center gap-2.5 ${
                decision === "reject"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Reject Match (Visual mismatch / False positive)</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision("request_evidence")}
              className={`w-full p-3 rounded-xl border font-bold text-xs text-left transition-all flex items-center gap-2.5 ${
                decision === "request_evidence"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              <FileSearch className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Request Additional CCTV / Biometric Evidence</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
            Officer Remarks & Verification Notes
          </label>
          <textarea
            rows={3}
            required
            placeholder="Provide official investigation rationale for police audit logs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            Submit Official Decision
          </Button>
        </div>
      </form>
    </Modal>
  );
};
