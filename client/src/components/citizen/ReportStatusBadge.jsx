import React from "react";
import { Badge } from "@/components/ui/Badge";

export const ReportStatusBadge = ({ status, size = "sm" }) => {
  switch (status) {
    case "Match Found":
      return (
        <Badge variant="primary" pulse size={size} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold">
          Match Found
        </Badge>
      );
    case "Processing":
      return (
        <Badge variant="warning" pulse size={size} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
          Processing
        </Badge>
      );
    case "Under Review":
      return (
        <Badge variant="neutral" size={size} className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold">
          Under Review
        </Badge>
      );
    case "Resolved":
      return (
        <Badge variant="success" size={size} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
          Resolved
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
};
