import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShieldAlert, Cpu, FileText, ArrowLeft } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PoliceNotifications() {
  const navigate = useNavigate();
  const { policeNotifications } = usePolice();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Police Alert Notifications Center</h1>
            <p className="text-xs text-slate-400">High-priority alerts for critical cases and AI matches.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/police/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {policeNotifications.map((n) => (
          <Card key={n.id} className="p-4 bg-slate-900 border-slate-800 text-white flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              n.priority === "Critical" ? "bg-red-600/20 text-red-400 ring-1 ring-red-500/30" : "bg-blue-500/20 text-blue-400"
            }`}>
              {n.priority === "Critical" ? <ShieldAlert className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>

            <div className="space-y-1 text-xs flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">{n.title}</h4>
                <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px] font-mono">
                {n.message}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
