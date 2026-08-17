import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, ArrowLeft, CheckCircle2, HeartPulse } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NgoNotifications() {
  const navigate = useNavigate();
  const { ngoNotifications } = useNgo();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-650 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-850 dark:text-white">NGO Care Notifications Center</h1>
            <p className="text-xs text-slate-550 dark:text-slate-400">Alerts for reunification readiness, medical updates, and capacity notices.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/ngo/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      <div className="space-y-3">
        {ngoNotifications.map((n) => (
          <Card key={n.id} className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white flex items-start gap-3 shadow-md">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-655 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-850 dark:text-white">{n.title}</h4>
                <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
              </div>
              <p className="text-slate-650 dark:text-slate-300 leading-relaxed text-[11px] font-mono">{n.message}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
