import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Info, AlertTriangle, ArrowLeft, CheckCheck } from "lucide-react";
import { useRealtime } from "@/context/RealtimeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CitizenNotifications() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useRealtime();

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
            <p className="text-xs text-gray-500">Live alerts for sighting reviews & status updates.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} leftIcon={CheckCheck} className="text-xs">
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/citizen/dashboard")} leftIcon={ArrowLeft}>
            Dashboard
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
            <Bell className="w-8 h-8 text-indigo-400/40 mx-auto" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">No notifications yet.</p>
            <p className="text-[11px] text-gray-400">Updates regarding your submitted sightings and case alerts will appear here in real time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                !n.isRead ? "border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20" : "hover:border-teal-500/30"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  n.variant === "success"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : n.variant === "warning"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-indigo-500/10 text-indigo-500"
                }`}
              >
                {n.variant === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : n.variant === "warning" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{n.time}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">{n.message}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
