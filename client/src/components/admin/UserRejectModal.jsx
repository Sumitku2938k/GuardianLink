import React, { useState } from "react";
import { XCircle, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const UserRejectModal = ({ isOpen, onClose, user, onConfirmReject }) => {
  const [reason, setReason] = useState("Organization credentials could not be verified.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirmReject(user.id, reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <XCircle className="w-5 h-5" />
          <span>Reject Registration Application</span>
        </div>
      }
      subtitle={`Applicant: ${user.name} (${user.role} • ${user.email})`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 leading-relaxed text-[11px]">
          Rejecting this application will mark <strong>{user.name}</strong>'s {user.role} registration as rejected. The user will be notified of the decision and reason when attempting to access the platform.
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-500 font-bold uppercase block mb-1">
            Reason for Rejection (Displayed to user)
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Official department credentials could not be verified."
            className="w-full py-2 px-3 text-xs rounded-xl bg-white border border-gray-200 text-slate-900 outline-none resize-none focus:border-rose-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150">
          <Button variant="outline" size="sm" type="button" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className="bg-rose-600 text-white font-bold hover:bg-rose-700"
          >
            Confirm Rejection
          </Button>
        </div>
      </form>
    </Modal>
  );
};
