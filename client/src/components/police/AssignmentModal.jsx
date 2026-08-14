import React, { useState } from "react";
import { UserCheck, Shield, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePolice } from "@/context/PoliceContext";

export const AssignmentModal = ({ isOpen, onClose, selectedCase, onAssignConfirm }) => {
  const { officers } = usePolice();
  const [selectedOfficerId, setSelectedOfficerId] = useState(officers[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedCase) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onAssignConfirm(selectedCase.id, selectedOfficerId);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-blue-400">
          <UserCheck className="w-6 h-6" />
          <span>Assign Officer to Case</span>
        </div>
      }
      subtitle={`Case #${selectedCase.caseNumber} • ${selectedCase.childName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <p className="text-slate-300 leading-relaxed">
          Select an officer from the active roster to lead the investigation squad for Case <strong>#{selectedCase.caseNumber}</strong>.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block">
            Select Assigned Officer
          </label>
          <div className="space-y-2">
            {officers.map((off) => (
              <div
                key={off.id}
                onClick={() => setSelectedOfficerId(off.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedOfficerId === off.id
                    ? "bg-blue-600/20 text-blue-300 border-blue-500/50 ring-1 ring-blue-500/30"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={off.avatar} alt={off.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <strong className="block text-white font-bold">{off.name}</strong>
                    <span className="text-[10px] text-slate-400 block">{off.rank} • {off.badgeNumber}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-teal-400 block">{off.activeCases} Active</span>
                  <span className="text-[10px] text-slate-400 block">{off.availability}</span>
                </div>
              </div>
            ))}
          </div>
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
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
