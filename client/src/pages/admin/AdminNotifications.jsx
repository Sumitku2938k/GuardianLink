import React from "react";
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Send, Mail } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminNotifications() {
  const { notificationsLog, handleRetryNotification } = useAdmin();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Platform Notification Delivery Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor push alerts, SMS notifications, and email dispatches across police posts, parents, and shelter staff.
          </p>
        </div>
      </div>

      {/* NOTIFICATIONS STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Dispatched</span>
          <strong className="text-slate-900 text-lg font-black block mt-0.5">{notificationsLog.length}</strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Delivered</span>
          <strong className="text-emerald-600 text-lg font-black block mt-0.5">
            {notificationsLog.filter((n) => n.status === "Delivered").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Queued / Pending</span>
          <strong className="text-amber-600 text-lg font-black block mt-0.5">
            {notificationsLog.filter((n) => n.status === "Queued" || n.status === "Sent").length}
          </strong>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">Failed Dispatches</span>
          <strong className="text-rose-600 text-lg font-black block mt-0.5">
            {notificationsLog.filter((n) => n.status === "Failed").length}
          </strong>
        </div>
      </div>

      {/* LOG TABLE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">Notification ID</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Recipient Role</th>
              <th className="py-3.5 px-4 font-bold">Notification Title</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Sent Time</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {notificationsLog.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                  {n.id}
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {n.type}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-800 font-semibold">
                  {n.recipientRole}
                </td>

                <td className="py-3.5 px-4 text-slate-900 font-bold">
                  {n.title}
                </td>

                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      n.status === "Delivered"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {n.status}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                  {n.sentAt}
                </td>

                <td className="py-3.5 px-4 text-right">
                  {n.status === "Failed" ? (
                    <Button
                      onClick={() => handleRetryNotification(n.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      leftIcon={RefreshCw}
                    >
                      Retry Dispatch
                    </Button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">Confirmed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
