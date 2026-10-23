import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, ArrowLeft, CheckCircle2, CheckCheck } from "lucide-react";
import { useRealtime } from "@/context/RealtimeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NgoNotifications() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useRealtime();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-650 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-850 dark:text-white">NGO Care Notifications Center</h1>
            <p className="text-xs text-slate-550 dark:text-slate-400">Alerts for reunification readiness, police handover approvals, and intake notices.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} leftIcon={CheckCheck} className="text-xs">
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/ngo/dashboard")} leftIcon={ArrowLeft}>
            Dashboard
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2">
            <Bell className="w-8 h-8 text-teal-500/40 mx-auto" />
            <p className="font-semibold">No notifications right now.</p>
            <p className="text-[11px] text-slate-400">Intake alerts, police handover approvals, and medical updates will appear here in real time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`p-4 bg-white dark:bg-slate-900 border text-slate-850 dark:text-white flex items-start gap-3 shadow-md transition-colors cursor-pointer ${
                !n.isRead ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/20" : "border-gray-200 dark:border-slate-800 hover:border-teal-500/30"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-655 dark:text-teal-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-850 dark:text-white">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                </div>
                <p className="text-slate-650 dark:text-slate-300 leading-relaxed text-[11px] font-mono">{n.message}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
