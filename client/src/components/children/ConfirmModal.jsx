import React, { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action? This cannot be undone.",
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  requireInput = false,
  requireInputValue = "",
  inputPlaceholder = "Type confirmation here"
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm();
      setIsSubmitting(false);
      setInputValue("");
      onClose();
    }, 1000);
  };

  const isConfirmDisabled = requireInput && inputValue.trim().toLowerCase() !== requireInputValue.trim().toLowerCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="w-5 h-5" />
          <span>{title}</span>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {message}
        </p>

        {requireInput && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Please type <strong className="text-red-500">"{requireInputValue}"</strong> to confirm:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-red-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            isDisabled={isConfirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
