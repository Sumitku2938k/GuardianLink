import React from "react";
import { AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const CasePriorityBadge = ({ priority, size = "sm" }) => {
  const normalized = (priority || "").toLowerCase().trim();

  switch (normalized) {
    case "critical":
      return (
        <Badge variant="danger" pulse size={size} icon={ShieldAlert} className="bg-red-600 text-white border-transparent font-black shadow-sm">
          CRITICAL
        </Badge>
      );
    case "high":
      return (
        <Badge variant="danger" size={size} icon={AlertTriangle} className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold">
          High Priority
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="warning" size={size} icon={AlertCircle} className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
          Medium Priority
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge variant="neutral" size={size} className="font-semibold">
          Low Priority
        </Badge>
      );
  }
};
