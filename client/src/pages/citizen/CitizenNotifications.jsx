import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Info, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function CitizenNotifications() {
  const navigate = useNavigate();
  const { notifications } = useCitizen();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Citizen Notifications</h1>
            <p className="text-xs text-gray-500">Live alerts for AI match triggers & guardian proxy responses.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="p-4 flex items-start gap-3 hover:border-teal-500/30 transition-colors">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              n.type === "success"
                ? "bg-emerald-500/10 text-emerald-500"
                : n.type === "info"
                ? "bg-indigo-500/10 text-indigo-500"
                : "bg-amber-500/10 text-amber-500"
            }`}>
              {n.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : n.type === "info" ? <Info className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>

            <div className="space-y-1 text-xs flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                <span className="text-[10px] text-gray-400 font-mono">{n.time}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">
                {n.message}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
