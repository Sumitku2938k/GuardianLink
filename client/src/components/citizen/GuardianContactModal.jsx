import React from "react";
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, Lock, PhoneCall } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const GuardianContactModal = ({
  isOpen,
  onClose,
  candidate,
  requestSent,
  requestStatus,
  onRequestSend
}) => {
  if (!candidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-teal-600">
          <ShieldCheck className="w-6 h-6" />
          <span>Request Guardian Contact</span>
        </div>
      }
      subtitle={`Secure Proxy Request - Case #${candidate.caseNumber}`}
      maxWidth="max-w-md"
    >
      {!requestSent ? (
        <div className="space-y-6 py-2">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            The verified parent/guardian will receive an immediate high-priority alert that a potential match has been sighted for <strong>{candidate.childName}</strong>.
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 space-y-2 border border-gray-100 dark:border-slate-800 text-xs">
            <span className="text-gray-400 block font-bold uppercase text-[10px]">Included Proxy Details</span>
            <div className="space-y-1">
              <div>• Sighting Location: <strong>Sector 14 Public Kiosk</strong></div>
              <div>• Helper Status: <strong>Verified Citizen Helper</strong></div>
              <div>• Sighting Time: <strong>Just Now</strong></div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-start gap-2">
            <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-slate-300">
              Your phone number is kept private until the guardian accepts the connection request.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onRequestSend}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
            >
              Send Secure Request
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 text-center py-4">
          {requestStatus === "Pending" && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-500/10 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Awaiting Guardian Response</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  High-priority push alert sent to guardian's verified device.
                </p>
              </div>
              <Badge variant="warning" size="sm" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                Status: Pending Confirmation (3s demo timer)
              </Badge>
            </div>
          )}

          {requestStatus === "Accepted" && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Guardian Accepted Contact!</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Guardian John Mehta confirmed the match and initiated direct handover dispatch.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-semibold space-y-2">
                <div>📞 Direct Emergency Bridge: <strong>+91 98110 00100</strong></div>
                <div>📍 Live GPS Location sharing activated.</div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="w-full bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              >
                Close & View Active Report
              </Button>
            </div>
          )}

          {requestStatus === "Declined" && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-500/10">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-600">Guardian Did Not Confirm</h3>
                <p className="text-xs text-gray-500 mt-1">
                  The guardian did not confirm this candidate match.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onClose} className="w-full">
                Close & Submit Found Child Report
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
