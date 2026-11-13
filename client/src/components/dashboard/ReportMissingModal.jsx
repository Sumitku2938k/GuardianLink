import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldCheck, ArrowRight, PhoneCall } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const ReportMissingModal = ({ isOpen, onClose, selectedChild }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleProceedToOfficialReport = () => {
    onClose();
    navigate(`/parent/missing-cases/new${selectedChild?.id ? `?childId=${selectedChild.id}` : ""}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <span>Report Child Missing</span>
        </div>
      }
      subtitle="Initiate an official missing case with law enforcement and facial recognition search"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 py-2 text-xs">
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-200 leading-relaxed">
          <strong>Immediate Protocol:</strong> Filing a missing report registers the incident with verified investigating police units and activates the biometric matching engine for citizen sighting verification.
        </div>

        {selectedChild && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center gap-3">
            {selectedChild.photo && (
              <img
                src={selectedChild.photo}
                alt={selectedChild.name}
                className="w-12 h-12 rounded-xl object-cover border border-gray-200"
              />
            )}
            <div>
              <strong className="text-sm text-slate-900 dark:text-white block">{selectedChild.name}</strong>
              <span className="text-slate-500 text-[11px]">Child Safety ID: {selectedChild.emergencyPin || selectedChild.id}</span>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-800 dark:text-blue-200 space-y-2">
          <strong className="block text-[11px] uppercase tracking-wide">Emergency Helplines (Dial Immediately)</strong>
          <div className="flex gap-2">
            <a
              href="tel:112"
              className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white font-bold text-center hover:bg-blue-700 text-xs flex items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Police (112)
            </a>
            <a
              href="tel:1098"
              className="flex-1 py-2 px-3 rounded-lg bg-teal-600 text-white font-bold text-center hover:bg-teal-700 text-xs flex items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Childline (1098)
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <Button
            variant="primary"
            size="md"
            onClick={handleProceedToOfficialReport}
            rightIcon={ArrowRight}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Proceed to Official Incident Report Form
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
