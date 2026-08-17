import React, { useState } from "react";
import { Building2, ShieldCheck, FileText, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const OrgVerificationModal = ({ isOpen, onClose, org, onConfirmDecision }) => {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!org) return null;

  const handleDecision = (decision) => {
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmDecision(org.id, decision);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-indigo-700">
          <Building2 className="w-5 h-5" />
          <span>Organization Verification Review</span>
        </div>
      }
      subtitle={`${org.name} • ${org.type} Organization`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 text-xs">
        {/* Org Summary & License Details */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-2">
          <div className="flex justify-between items-center">
            <strong className="text-slate-900 font-bold">{org.name}</strong>
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
              {org.verificationStatus}
            </span>
          </div>
          <p className="text-slate-600 text-[11px]">Location: {org.location}</p>
          <div className="text-slate-500 font-mono text-[10px]">
            Contact: {org.contactPerson} ({org.email})
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
            Verification Review Checklist
          </span>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Government Registration Certificate Submitted</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Official License & Shelter Capacity Validated</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Police / NGO Coordinator Credentials Verified</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-500 font-bold uppercase block mb-1">
            Verification Remarks / Request Details
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add official administrative remarks..."
            className="w-full py-2 px-3 text-xs rounded-xl bg-white border border-gray-200 text-slate-900 outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-150">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDecision("More Info Requested")}
            isDisabled={isSubmitting}
            leftIcon={HelpCircle}
          >
            Request Info
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDecision("Rejected")}
              isDisabled={isSubmitting}
              leftIcon={XCircle}
            >
              Reject
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDecision("Verified")}
              isLoading={isSubmitting}
              className="bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              leftIcon={ShieldCheck}
            >
              Verify Organization
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
