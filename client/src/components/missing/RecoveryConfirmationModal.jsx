import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, MapPin, Calendar, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const RecoveryConfirmationModal = ({ isOpen, onClose, caseData, onConfirmClose }) => {
  const [step, setStep] = useState(1);
  const [isRecovered, setIsRecovered] = useState(true);
  const [recoveryData, setRecoveryData] = useState({
    location: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    if (!isRecovered) {
      onClose();
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmClose(caseData.id, recoveryData);
      onClose();
    } catch (err) {
      console.error("Error closing case:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!caseData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <span>Child Safe Recovery & Case Closure</span>
        </div>
      }
      subtitle={`Case #${caseData.caseNumber} - ${caseData.childName}`}
      maxWidth="max-w-lg"
    >
      {step === 1 ? (
        <div className="space-y-6 text-center py-2">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              Confirm Child Safe Recovery
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Have you safely recovered <strong>{caseData.childName}</strong> and confirmed their identity?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setIsRecovered(true)}
              className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                isRecovered
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-md"
                  : "border-gray-200 dark:border-slate-800 text-gray-500"
              }`}
            >
              ✓ Yes, Child Recovered
            </button>

            <button
              type="button"
              onClick={() => setIsRecovered(false)}
              className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                !isRecovered
                  ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-md"
                  : "border-gray-200 dark:border-slate-800 text-gray-500"
              }`}
            >
              ✕ No, Case Active
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleNextStep}>
              {isRecovered ? "Proceed to Recovery Details" : "Keep Case Open"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            Please record the recovery details for police and system record archives.
          </div>

          <Input
            label="Recovery Location"
            placeholder="e.g. Sector 14 Security Gate, Delhi"
            required
            icon={MapPin}
            value={recoveryData.location}
            onChange={(e) => setRecoveryData({ ...recoveryData, location: e.target.value })}
          />

          <Input
            label="Recovery Date"
            type="date"
            required
            icon={Calendar}
            value={recoveryData.date}
            onChange={(e) => setRecoveryData({ ...recoveryData, date: e.target.value })}
          />

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              Recovery Notes & Remarks
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Child located by police patrol, checked by doctor and verified healthy."
              value={recoveryData.notes}
              onChange={(e) => setRecoveryData({ ...recoveryData, notes: e.target.value })}
              className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(1)} isDisabled={isSubmitting}>
              Back
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={CheckCircle2}>
              Formally Close Missing Case
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
