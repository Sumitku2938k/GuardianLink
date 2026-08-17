import React from "react";
import { Badge } from "@/components/ui/Badge";

export const CareStatusBadge = ({ status, size = "sm" }) => {
  switch (status) {
    case "Newly Received":
      return (
        <Badge variant="primary" pulse size={size} className="bg-teal-500/20 text-teal-300 border-teal-500/30 font-bold">
          Newly Received
        </Badge>
      );
    case "Under Assessment":
      return (
        <Badge variant="warning" size={size} className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold">
          Under Assessment
        </Badge>
      );
    case "Stable":
      return (
        <Badge variant="success" size={size} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold">
          Stable
        </Badge>
      );
    case "Medical Attention":
      return (
        <Badge variant="danger" pulse size={size} className="bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold">
          Medical Attention
        </Badge>
      );
    case "Awaiting Verification":
      return (
        <Badge variant="primary" pulse size={size} className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold">
          Awaiting Verification
        </Badge>
      );
    case "Reunification Pending":
      return (
        <Badge variant="secondary" pulse size={size} className="bg-teal-400/20 text-teal-300 border-teal-400/30 font-extrabold">
          Reunification Pending
        </Badge>
      );
    case "Released":
    case "Closed":
      return (
        <Badge variant="success" size={size} className="bg-slate-800 text-slate-300 font-bold">
          {status}
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
};
