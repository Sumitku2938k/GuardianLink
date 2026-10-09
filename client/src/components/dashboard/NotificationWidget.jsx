import React, { useState, useEffect } from "react";
import { Bell, ShieldAlert, CheckCircle, Info, Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const NotificationWidget = ({
  notifications: initialNotifs = [],
}) => {
  const [filter, setFilter] = useState("all");
  const [notifs, setNotifs] = useState(initialNotifs);

  useEffect(() => {
    setNotifs(initialNotifs);
  }, [initialNotifs]);

  const filteredNotifs = notifs.filter((n) => {
    if (filter === "all") return true;
    return n.category === filter;
  });

  const toggleRead = (id) => {
    setNotifs(notifs.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n)));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Recent Notifications
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live alert feeds and safety notifications
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === "all"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("alert")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === "alert"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl">
            No safety notifications or alerts in this view.
          </div>
        ) : (
          filteredNotifs.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                !item.isRead
                  ? "bg-primary/5 dark:bg-slate-800/80 border-primary/20"
                  : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-75"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    item.category === "alert"
                      ? "bg-rose-500/10 text-rose-500"
                      : item.category === "system"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-teal-500/10 text-teal-500"
                  }`}
                >
                  {item.category === "alert" ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : item.category === "system" ? (
                    <Info className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium">{item.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
