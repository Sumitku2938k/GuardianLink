import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShieldAlert, Cpu, ArrowLeft, CheckCheck, FileText } from "lucide-react";
import { useRealtime } from "@/context/RealtimeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PoliceNotifications() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useRealtime();

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
            <p className="text-xs text-slate-400">High-priority alerts for citizen sightings, case milestones, and AI matches.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} leftIcon={CheckCheck} className="text-xs text-slate-300 hover:text-white">
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/police/dashboard")} leftIcon={ArrowLeft}>
            Dashboard
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <Bell className="w-8 h-8 text-blue-400/40 mx-auto" />
            <p className="font-semibold text-slate-200">No active alerts.</p>
            <p className="text-[11px] text-slate-500">New citizen sightings, case transfers, and AI facial matches will appear here in real time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`p-4 bg-slate-900 border-slate-800 text-white flex items-start gap-3 transition-colors cursor-pointer ${
                !n.isRead ? "border-blue-500/50 bg-slate-850/90 shadow-sm" : "hover:border-slate-700"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  n.variant === "warning" || n.type === "sighting_reported"
                    ? "bg-red-600/20 text-red-400 ring-1 ring-red-500/30"
                    : n.variant === "success"
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {n.variant === "warning" || n.type === "sighting_reported" ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : n.type === "match_flagged" ? (
                  <Cpu className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px] font-mono">{n.message}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
