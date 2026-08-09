import React from "react";
import { Plus, Shield, UserCheck, Heart, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const ChildTimeline = ({ events }) => {
  const getIcon = (iconName) => {
    switch (iconName) {
      case "Plus":
        return <Plus className="w-3.5 h-3.5" />;
      case "Shield":
        return <Shield className="w-3.5 h-3.5" />;
      case "UserCheck":
        return <UserCheck className="w-3.5 h-3.5" />;
      case "Heart":
        return <Heart className="w-3.5 h-3.5" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "RefreshCw":
      default:
        return <RefreshCw className="w-3.5 h-3.5" />;
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
        No log entries recorded for this child.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
      {events.map((event) => (
        <div key={event.id} className="relative flex items-start group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-primary flex items-center justify-center text-primary shadow-sm z-10">
            {getIcon(event.icon)}
          </div>

          {/* Event Content */}
          <div className="flex-1 ml-4 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 group-hover:border-primary/30 transition-all shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {event.title}
              </h4>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                {event.time}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              {event.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
