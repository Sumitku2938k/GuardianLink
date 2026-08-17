import React, { useState } from "react";
import { ArrowLeftRight, Plus, CheckCircle2, Clock } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function NgoTransfers() {
  const { transfers, createTransfer, childrenInCare } = useNgo();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    childReference: childrenInCare[0]?.childReference || "Kabir Mehta",
    fromFacility: "Helping Hands Shelter - Sector 12",
    toFacility: "City Children's Hospital",
    reason: "Pediatric Medical Checkup",
    scheduledTime: "Today 16:00",
    responsibleStaff: "Dr. Roy"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTransfer(formData);
    setIsModalOpen(false);
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

        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400" leftIcon={Plus}>
          Initiate Transfer
        </Button>
      </div>

      <div className="space-y-3">
        {transfers.map((t) => (
          <Card key={t.id} className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white flex items-center justify-between gap-4 shadow-md">
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
        ))}
      </div>

      {/* Create Transfer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initiate Shelter Transfer" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input label="Child Reference" value={formData.childReference} onChange={(e) => setFormData({ ...formData, childReference: e.target.value })} required />
          <Input label="Destination Facility" value={formData.toFacility} onChange={(e) => setFormData({ ...formData, toFacility: e.target.value })} required />
          <Input label="Reason for Transfer" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-150 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-teal-500 text-slate-950 font-bold">Submit Transfer Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
