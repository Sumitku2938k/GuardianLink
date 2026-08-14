import React, { useState } from "react";
import { Users, UserPlus, ShieldCheck, CheckCircle2 } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { OfficerWorkloadCard } from "@/components/police/OfficerWorkloadCard";
import { AssignmentModal } from "@/components/police/AssignmentModal";
import { Button } from "@/components/ui/Button";

export default function PoliceAssignments() {
  const { officers, policeCases, assignOfficer } = usePolice();
  const [selectedCase, setSelectedCase] = useState(policeCases[0] || null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReassignClick = (officer) => {
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400 shrink-0" />
            <span>Officer Workload & Squad Roster</span>
          </h1>
          <p className="text-xs text-slate-400">Manage case distribution and active duty officer assignments.</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" leftIcon={UserPlus} className="bg-blue-600 hover:bg-blue-500 text-xs">
          Assign Case Load
        </Button>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officers.map((off) => (
          <OfficerWorkloadCard
            key={off.id}
            officer={off}
            onReassignClick={handleReassignClick}
          />
        ))}
      </div>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCase={selectedCase}
        onAssignConfirm={(cId, oId) => assignOfficer(cId, oId)}
      />
    </div>
  );
}
