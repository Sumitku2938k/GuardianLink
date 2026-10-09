import React, { useState } from "react";
import { AlertTriangle, MapPin, Clock, ShieldAlert, Send, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export const ReportMissingModal = ({ isOpen, onClose, selectedChild, onReportSubmitted }) => {
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [lastSeenTime, setLastSeenTime] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  const handleTriggerBroadcast = (e) => {
    e.preventDefault();
    setIsBroadcasting(true);

    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastDone(true);
      if (onReportSubmitted) {
        onReportSubmitted({
          childId: selectedChild?.id || "unknown",
          childName: selectedChild?.name || "Child",
          lastSeenLocation,
          lastSeenTime,
          reportedAt: "Just Now",
        });
      }
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setBroadcastDone(false);
        onClose();
      }}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <span>Report Emergency Missing Child</span>
        </div>
      }
      subtitle="Triggers rapid AI face match across public CCTV & emergency citizen dispatch network"
      maxWidth="max-w-xl"
    >
      {broadcastDone ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-500/10 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-rose-600">
              EMERGENCY BROADCAST ACTIVE!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
              Alert dispatched to <strong>1,420 Nearby Citizens</strong>, <strong>Police Control Room #100</strong>, and <strong>CCTV Neural Network</strong>.
            </p>
          </div>
          <div className="p-4 bg-slate-900 text-white rounded-2xl text-left text-xs font-mono space-y-1">
            <p className="text-teal-400 font-bold">STATUS: RECOGNITION PIPELINE LIVE</p>
            <p>Target ID: {selectedChild?.emergencyPin || "GL-9482"}</p>
            <p>Scanning 4,800+ Camera Feeds within 15km Radius...</p>
          </div>
          <Button
            onClick={() => {
              setBroadcastDone(false);
              onClose();
            }}
            variant="primary"
            className="w-full mt-4"
          >
            Return to Dashboard Tracker
          </Button>
        </div>
      ) : (
        <form onSubmit={handleTriggerBroadcast} className="space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
            <img
              src={selectedChild?.photo}
              alt={selectedChild?.name}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-rose-500/30"
            />
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {selectedChild?.name || "Select Child"}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Age: {selectedChild?.age || "8"} yrs • Blood: {selectedChild?.bloodGroup || "O+"}
              </p>
            </div>
          </div>

          <Input
            label="Last Known Location"
            placeholder="e.g. Near City Park Gate #2"
            required
            icon={MapPin}
            value={lastSeenLocation}
            onChange={(e) => setLastSeenLocation(e.target.value)}
          />

          <Input
            label="Approximate Time Last Seen"
            placeholder="e.g. 15 minutes ago (04:30 PM)"
            required
            icon={Clock}
            value={lastSeenTime}
            onChange={(e) => setLastSeenTime(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              Clothing / Appearance & Context Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Wearing blue school uniform, carrying red backpack..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-rose-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button variant="outline" onClick={onClose} isDisabled={isBroadcasting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              isLoading={isBroadcasting}
              leftIcon={Send}
            >
              TRIGGER RED ALERT BROADCAST
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
