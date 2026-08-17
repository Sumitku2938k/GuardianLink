import React, { useState } from "react";
import { Heart, Plus, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const CareUpdateFormModal = ({ isOpen, onClose, child, onSaveCareUpdate }) => {
  const [category, setCategory] = useState("Nutrition"); // Nutrition, Medical Care, Emotional Support, Clothing, General Wellbeing
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!child) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSaveCareUpdate(child.id, { category, notes });
      setNotes("");
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-teal-650 dark:text-teal-400">
          <Heart className="w-5 h-5 fill-current" />
          <span>Record Daily Wellbeing & Care Update</span>
        </div>
      }
      subtitle={`${child.childReference} • Intake #${child.intakeId}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">
            Care Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
          >
            <option value="Nutrition" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Nutrition & Meals</option>
            <option value="Medical Care" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Medical Check & Medication</option>
            <option value="Emotional Support" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Emotional Support & Counseling</option>
            <option value="Clothing" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Clothing & Hygiene</option>
            <option value="General Wellbeing" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">General Rest & Wellbeing</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">
            Care Activity & Notes
          </label>
          <textarea
            rows={3}
            required
            placeholder="Describe meals provided, resting hours, emotional state, or staff observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-teal-500 outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400"
          >
            Save Care Log
          </Button>
        </div>
      </form>
    </Modal>
  );
};
