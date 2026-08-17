import React, { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const UserSuspendModal = ({ isOpen, onClose, user, onConfirmSuspend }) => {
  const [reason, setReason] = useState("Violation of platform safety guidelines");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmSuspend(user.id, reason);
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-5 h-5" />
          <span>Suspend User Account Access</span>
        </div>
      }
      subtitle={`User: ${user.name} (${user.email})`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 leading-relaxed text-[11px]">
          Suspending this account will immediately prevent <strong>{user.name}</strong> from logging into GuardianLink, submitting citizen reports, or viewing case files.
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-500 font-bold uppercase block mb-1">
            Reason for Suspension (Logged in Audit History)
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Specify reason for administrative suspension..."
            className="w-full py-2 px-3 text-xs rounded-xl bg-white border border-gray-200 text-slate-900 outline-none resize-none focus:border-rose-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150">
          <Button variant="outline" size="sm" type="button" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            className="bg-rose-600 text-white font-bold hover:bg-rose-700"
            leftIcon={Lock}
          >
            Suspend Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};
