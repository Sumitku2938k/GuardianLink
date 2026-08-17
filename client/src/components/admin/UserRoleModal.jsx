import React, { useState } from "react";
import { ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const UserRoleModal = ({ isOpen, onClose, user, onConfirmRoleChange }) => {
  const [selectedRole, setSelectedRole] = useState(user?.role || "Citizen");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onConfirmRoleChange(user.id, selectedRole);
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
          <ShieldAlert className="w-5 h-5" />
          <span>Modify User Platform Access Role</span>
        </div>
      }
      subtitle={`User: ${user.name} (${user.id})`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Role Impact Warning Banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
          <strong>Security Notice:</strong> Changing a user's role grants or restricts platform access levels (e.g. Police Case files, NGO intake records, Citizen reporting tools).
        </div>

        {/* Current vs New Role Display */}
        <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between font-bold">
          <span className="text-slate-600">Current Role: {user.role}</span>
          <ArrowRight className="w-4 h-4 text-indigo-600" />
          <span className="text-indigo-700">New Role: {selectedRole}</span>
        </div>

        <div>
          <label className="text-[11px] font-mono text-slate-500 font-bold uppercase block mb-1">
            Select Target Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full py-2.5 px-3 text-xs rounded-xl bg-white text-slate-900 border border-gray-200 outline-none font-bold"
          >
            <option value="Parent">Parent / Guardian</option>
            <option value="Citizen">Citizen Volunteer</option>
            <option value="Police">Police Officer Escort</option>
            <option value="NGO">NGO Shelter Staff</option>
            <option value="Admin">Platform Administrator</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150">
          <Button variant="outline" size="sm" type="button" onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
            leftIcon={CheckCircle2}
          >
            Confirm Role Update
          </Button>
        </div>
      </form>
    </Modal>
  );
};
