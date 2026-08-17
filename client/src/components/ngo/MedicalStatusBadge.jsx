import React from "react";
import { Badge } from "@/components/ui/Badge";

export const MedicalStatusBadge = ({ status, size = "sm" }) => {
  switch (status) {
    case "Stable":
      return (
        <Badge variant="success" size={size} className="bg-emerald-500/10 text-emerald-400 font-semibold">
          Stable
        </Badge>
      );
    case "Monitoring":
      return (
        <Badge variant="warning" size={size} className="bg-amber-500/10 text-amber-400 font-semibold">
          Monitoring
        </Badge>
      );
    case "Medical Attention Required":
      return (
        <Badge variant="danger" pulse size={size} className="bg-rose-500/20 text-rose-300 font-bold">
          Medical Attention Needed
        </Badge>
      );
    case "Emergency":
      return (
        <Badge variant="danger" pulse size={size} className="bg-red-600 text-white font-black">
          EMERGENCY
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
};
