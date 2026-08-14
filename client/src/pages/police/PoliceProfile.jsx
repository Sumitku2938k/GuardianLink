import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Building2, ShieldCheck, Lock, ArrowLeft, Key } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function PoliceProfile() {
  const navigate = useNavigate();
  const { currentOfficer, currentStation } = usePolice();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Officer Profile & Station Credentials</h1>
            <p className="text-xs text-slate-400">Security Clearance Level 3 • Authorized Police Personnel.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/police/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-6">
        <div className="flex items-center gap-4">
          <img
            src={currentOfficer.avatar}
            alt={currentOfficer.name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/30 shrink-0"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{currentOfficer.name}</h2>
              <Badge variant="primary" size="sm" className="bg-blue-500/20 text-blue-400 font-bold">
                Level 3 Clearance
              </Badge>
            </div>
            <span className="text-xs text-slate-400 block font-mono">{currentOfficer.rank} • Badge #{currentOfficer.badgeNumber}</span>
            <span className="text-[11px] text-teal-400 font-bold flex items-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Police Credentials Verified
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Station</span>
            <strong className="text-white text-sm block mt-0.5">{currentStation}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Current Shift Roster</span>
            <strong className="text-teal-300 text-sm block mt-0.5">{currentOfficer.shift}</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
          <span className="text-blue-400 font-bold flex items-center gap-1.5">
            <Lock className="w-4 h-4" /> System Encryption & Data Access Policy
          </span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            All police actions, case status updates, and AI match verification decisions are cryptographically logged for official audit trails under National Child Protection Guidelines.
          </p>
        </div>
      </Card>
    </div>
  );
}
