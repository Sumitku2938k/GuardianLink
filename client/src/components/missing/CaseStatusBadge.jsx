import React from "react";
import { Badge } from "@/components/ui/Badge";

export const CaseStatusBadge = ({ status, size = "sm" }) => {
  const normalized = (status || "").toLowerCase().replace(/_/g, " ").trim();

  if (normalized === "active") {
    return (
      <Badge variant="danger" pulse size={size} className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold">
        Active Red Alert
      </Badge>
    );
  }

  if (normalized === "under review" || normalized === "reported" || normalized === "under verification") {
    return (
      <Badge variant="warning" pulse size={size} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
        {normalized === "reported" ? "Reported" : "Under Verification"}
      </Badge>
    );
  }

  if (normalized === "investigating") {
    return (
      <Badge variant="primary" pulse size={size} className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold">
        Investigating
      </Badge>
    );
  }

  if (normalized === "potential match") {
    return (
      <Badge variant="warning" pulse size={size} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold">
        Potential Match
      </Badge>
    );
  }

  if (normalized === "found") {
    return (
      <Badge variant="secondary" pulse size={size} className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-bold">
        Found
      </Badge>
    );
  }

  if (normalized === "reunification" || normalized === "reunited") {
    return (
      <Badge variant="secondary" pulse size={size} className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-bold">
        Reunited
      </Badge>
    );
  }

  if (normalized === "recovered" || normalized === "closed") {
    return (
      <Badge variant="success" size={size} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
        Closed
      </Badge>
    );
  }

  if (normalized === "cancelled") {
    return (
      <Badge variant="default" size={size} className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-bold">
        Cancelled
      </Badge>
    );
  }

  return <Badge size={size}>{status}</Badge>;
};
