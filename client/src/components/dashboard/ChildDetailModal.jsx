import React from "react";
import { Shield, MapPin, Heart, Calendar, FileText, Phone, CheckCircle2, Cpu, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const ChildDetailModal = ({ isOpen, onClose, child, onReportMissing }) => {
  if (!child) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span>Child Protection Profile</span>
        </div>
      }
      subtitle={`Emergency ID: ${child.emergencyPin || "GL-9482"}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Child Header Card */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 text-white rounded-2xl">
          <img
            src={child.photo}
            alt={child.name}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <h3 className="text-2xl font-black">{child.name}</h3>
              <Badge variant="success" pulse size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                {child.status || "Protected"}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Age: {child.age} years • Gender: {child.gender || "Male"} • Blood Group: <strong className="text-teal-300">{child.bloodGroup || "O+"}</strong>
            </p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-300">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{child.lastLocation || "Modern School Campus, Delhi"}</span>
            </div>
          </div>
        </div>

        {/* AI Biometrics & System Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
              <Cpu className="w-4 h-4" />
              <span>Face Indexing</span>
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white">99.8% Match</p>
            <span className="text-[10px] text-gray-400">12 Vector Points</span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Geofence Status</span>
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white">Inside Zone</p>
            <span className="text-[10px] text-gray-400">School Safe Perimeter</span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-teal-500 font-bold text-xs mb-1">
              <Phone className="w-4 h-4" />
              <span>Emergency Pin</span>
            </div>
            <p className="text-lg font-black font-mono text-gray-900 dark:text-white">
              {child.emergencyPin || "GL-9482"}
            </p>
            <span className="text-[10px] text-gray-400">Encrypted PIN</span>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Medical Profile & Additional Notes
          </h4>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            {child.medicalNotes || "No chronic allergies or medical conditions registered. Standard immunization records up to date."}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onClose();
              if (onReportMissing) onReportMissing(child);
            }}
            leftIcon={AlertTriangle}
            className="w-full sm:w-auto"
          >
            Report Emergency Missing Child
          </Button>
        </div>
      </div>
    </Modal>
  );
};
