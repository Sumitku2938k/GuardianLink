import React, { useState } from "react";
import { ArrowLeftRight, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function NgoTransfers() {
  const { transfers, createTransfer, childrenInCare } = useNgo();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    careRecordId: childrenInCare[0]?.id || "",
    childReference: childrenInCare[0]?.childReference || "",
    fromFacility: "NGO Temporary Care Shelter",
    toFacility: "City Children's Hospital",
    handoverType: "medical_facility",
    reason: "Pediatric Medical Checkup",
    scheduledTime: "Today 16:00",
    responsibleStaff: "NGO Staff"
  });

  const handleOpenModal = () => {
    setErrorMessage("");
    if (childrenInCare.length > 0 && !formData.careRecordId) {
      setFormData((prev) => ({
        ...prev,
        careRecordId: childrenInCare[0].id,
        childReference: childrenInCare[0].childReference
      }));
    }
    setIsModalOpen(true);
  };

  const handleChildSelect = (e) => {
    const selectedId = e.target.value;
    const selectedChild = childrenInCare.find((c) => c.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      careRecordId: selectedId,
      childReference: selectedChild?.childReference || ""
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await createTransfer({
        careRecordId: formData.careRecordId,
        childReference: formData.childReference,
        toFacility: formData.toFacility,
        handoverType: formData.handoverType,
        reason: formData.reason
      });
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to create transfer request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-855 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-teal-500 dark:text-teal-400 shrink-0" />
            <span>Shelter & Medical Facility Transfers</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400">Manage transfers between NGO shelters, medical units, and police custody.</p>
        </div>

        <Button onClick={handleOpenModal} variant="primary" className="bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400" leftIcon={Plus}>
          Initiate Transfer
        </Button>
      </div>

      <div className="space-y-3">
        {transfers.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-slate-500 text-xs">
            No transfer or handover records registered yet.
          </div>
        ) : (
          transfers.map((t) => (
            <Card key={t._id || t.id} className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white flex items-center justify-between gap-4 shadow-md">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <strong className="text-teal-650 dark:text-teal-300 font-mono font-bold">{t.id}</strong>
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold text-[10px]">{t.status}</span>
                </div>
                <h4 className="font-bold text-slate-850 dark:text-white text-sm">{t.childReference}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  From: {t.fromFacility} → To: <strong>{t.toFacility}</strong>
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-405 font-mono block">Reason: {t.reason} • Scheduled: {t.scheduledTime}</span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Transfer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initiate Shelter Transfer" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">
              Select Child in Care
            </label>
            <select
              value={formData.careRecordId}
              onChange={handleChildSelect}
              className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
              required
            >
              {childrenInCare.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                  {c.childReference} (Case #{c.caseNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">
              Transfer Type
            </label>
            <select
              value={formData.handoverType}
              onChange={(e) => setFormData({ ...formData, handoverType: e.target.value })}
              className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
            >
              <option value="medical_facility" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Medical Facility / Hospital</option>
              <option value="police_custody" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Police Protective Custody</option>
              <option value="specialized_shelter" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Specialized Shelter Care</option>
            </select>
          </div>

          <Input label="Destination Facility" value={formData.toFacility} onChange={(e) => setFormData({ ...formData, toFacility: e.target.value })} required />
          <Input label="Reason for Transfer" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-teal-500 text-slate-950 font-bold">Submit Transfer Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
