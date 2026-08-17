import React, { useState } from "react";
import { ShieldCheck, HeartHandshake, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const HandoverConfirmationModal = ({ isOpen, onClose, child, onConfirmHandover }) => {
  const [step, setStep] = useState(1);
  const [handoverData, setHandoverData] = useState({
    guardianName: "John Mehta",
    verifierOfficer: "Insp. R. S. Rathore",
    location: "Helping Hands Shelter Kiosk - Sector 12",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes: "Verified identity with police escort present. Child safely handed over."
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!child) return null;

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onConfirmHandover(child.id, handoverData);
      setIsSubmitting(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-teal-650 dark:text-teal-400">
          <HeartHandshake className="w-6 h-6" />
          <span>Reunification & Safe Child Release</span>
        </div>
      }
      subtitle={`${child.childReference} • Case #${child.caseNumber}`}
      maxWidth="max-w-lg"
    >
      {step === 1 ? (
        <div className="space-y-6 text-center py-2 text-xs">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white">Authorized Guardian Verification Required</h3>
            <p className="text-slate-650 dark:text-slate-300 max-w-sm mx-auto">
              Please confirm that police authorities have formally verified the legal identity of guardian <strong>{handoverData.guardianName}</strong> before releasing the child.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 text-left space-y-2">
            <div className="flex justify-between items-center text-teal-650 dark:text-teal-300 font-bold">
              <span>Verified Guardian: {handoverData.guardianName}</span>
              <span className="text-[10px] bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30 text-teal-600 dark:text-teal-300">Verified</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              Assigned Police Officer: <strong>{handoverData.verifierOfficer} ({child.policeStation})</strong>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(2)}
              className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400"
            >
              Proceed to Handover Details
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-600 dark:text-teal-300 font-semibold">
            Record final handover details for official NGO release archives.
          </div>

          <Input
            label="Handover Location"
            value={handoverData.location}
            onChange={(e) => setHandoverData({ ...handoverData, location: e.target.value })}
            required
          />

          <Input
            label="Handover Time"
            value={handoverData.time}
            onChange={(e) => setHandoverData({ ...handoverData, time: e.target.value })}
            required
          />

          <div>
            <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">
              Handover Remarks & Notes
            </label>
            <textarea
              rows={3}
              value={handoverData.notes}
              onChange={(e) => setHandoverData({ ...handoverData, notes: e.target.value })}
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(1)} isDisabled={isSubmitting}>
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-455"
              leftIcon={CheckCircle2}
            >
              Confirm Handover & Release Child
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
