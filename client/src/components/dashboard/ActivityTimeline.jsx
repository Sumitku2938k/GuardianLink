import React from "react";
import { CheckCircle2, ShieldCheck, RefreshCw, FileText, Clock, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const ActivityTimeline = ({
  activities = [
    {
      id: 1,
      title: "Child Registered",
      desc: "Aarav Doe profile created with high-res biometric facial feature vectors.",
      time: "Today, 09:30 AM",
      icon: CheckCircle2,
      status: "completed",
    },
    {
      id: 2,
      title: "Medical Information Updated",
      desc: "Added emergency contact, allergy info, and blood group details (O+).",
      time: "Yesterday, 04:15 PM",
      icon: FileText,
      status: "completed",
    },
    {
      id: 3,
      title: "AI Face Indexing Verified",
      desc: "AI engine indexed 12 biometric landmarks across 5 lighting angles.",
      time: "3 days ago",
      icon: ShieldCheck,
      status: "completed",
    },
    {
      id: 4,
      title: "No Active Alerts",
      desc: "All children monitored continuously. All safe zone signals clear.",
      time: "Just now",
      icon: CheckCircle2,
      status: "active",
    },
  ],
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Recent Activity Timeline</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time audit log of profile updates and safety check-ins
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          Live Sync
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
        {activities.map((item, idx) => {
          const Icon = item.icon || CheckCircle2;
          const isLast = idx === activities.length - 1;

          return (
            <div key={item.id} className="relative flex items-start group">
              {/* Icon Marker */}
              <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-primary flex items-center justify-center text-primary shadow-sm z-10">
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Event Content */}
              <div className="flex-1 ml-4 bg-gray-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-800 group-hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h4>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
