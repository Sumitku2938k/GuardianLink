import React, { useState, useEffect } from "react";
import { UserCheck, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePolice } from "@/context/PoliceContext";

export const AssignmentModal = ({ isOpen, onClose, selectedCase, onAssignConfirm }) => {
  const { officers } = usePolice();
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (officers && officers.length > 0 && !selectedOfficerId) {
      setSelectedOfficerId(officers[0].id || officers[0]._id);
    }
  }, [officers, selectedOfficerId]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!selectedCase) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOfficerId) {
      setErrorMessage("Please select an officer from the active roster.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onAssignConfirm(selectedCase.id || selectedCase._id, selectedOfficerId);
      onClose();
    } catch (err) {
      console.error("[AssignmentModal] Assignment error:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Failed to assign officer to case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-blue-400">
          <UserCheck className="w-6 h-6" />
          <span>Assign Lead Officer to Case</span>
        </div>
      }
      subtitle={`Case #${selectedCase.caseNumber} • ${selectedCase.childName || "Missing Child"}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <p className="text-slate-300 leading-relaxed">
          Select an officer from the station roster to lead the investigation squad for Case <strong>#{selectedCase.caseNumber}</strong>.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block">
            Select Assigned Officer ({officers?.length || 0} Available)
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {(!officers || officers.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400">
                No active duty officers found in station roster.
              </div>
            ) : (
              officers.map((off) => {
                const offId = off.id || off._id;
                const isSelected = selectedOfficerId === offId;
                const avatarSrc = off.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(off.name || "Officer")}&background=1e293b&color=60a5fa`;
                return (
                  <div
                    key={offId}
                    onClick={() => setSelectedOfficerId(offId)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-300 border-blue-500/50 ring-1 ring-blue-500/30"
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarSrc}
                        alt={off.name}
                        className="w-10 h-10 rounded-xl object-cover"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(off.name || "Officer")}&background=1e293b&color=60a5fa`;
                        }}
                      />
                      <div>
                        <strong className="block text-white font-bold">{off.name}</strong>
                        <span className="text-[10px] text-slate-400 block">
                          {off.rank || "Officer"} • {off.badgeNumber}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-teal-400 block">{off.activeCases ?? 0} Active</span>
                      <span className="text-[10px] text-slate-400 block">{off.availability || off.status || "Active Duty"}</span>
                    </div>
                  </div>
                );
              })
            )}
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
            isDisabled={!officers || officers.length === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
