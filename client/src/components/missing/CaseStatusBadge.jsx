import React from "react";
import { Badge } from "@/components/ui/Badge";

export const CaseStatusBadge = ({ status, size = "sm" }) => {
  switch (status) {
    case "Active":
      return (
        <Badge variant="danger" pulse size={size} className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold">
          Active Red Alert
        </Badge>
      );
    case "Under Review":
      return (
        <Badge variant="warning" pulse size={size} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
          Under Review
        </Badge>
      );
    case "Investigating":
      return (
        <Badge variant="primary" pulse size={size} className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold">
          Investigating
        </Badge>
      );
    case "Potential Match":
      return (
        <Badge variant="warning" pulse size={size} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold">
          Potential Match
        </Badge>
      );
    case "Found":
    case "Reunification":
      return (
        <Badge variant="secondary" pulse size={size} className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-bold">
          {status}
        </Badge>
      );
    case "Recovered":
    case "Closed":
      return (
        <Badge variant="success" size={size} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
          {status}
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
};
