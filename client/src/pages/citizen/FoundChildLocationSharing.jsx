import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, ShieldCheck, MapPin, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function FoundChildLocationSharing() {
  const navigate = useNavigate();
  const { workflowSession } = useCitizen();
  const [isSharing, setIsSharing] = useState(true);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <Compass className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Live Location Sharing</h1>
            <p className="text-xs text-gray-500">Coordinates shared with verified parent & police responders.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Compass className={`w-5 h-5 ${isSharing ? "text-teal-400 animate-spin" : "text-gray-400"}`} />
            <span>Signal Status: {isSharing ? "Sharing Live GPS" : "Location Sharing Paused"}</span>
          </div>

          <Badge variant={isSharing ? "success" : "neutral"} pulse={isSharing} size="sm">
            {isSharing ? "Active Signal" : "Paused"}
          </Badge>
        </div>

        <MapPlaceholder
          locationName={workflowSession.locationName}
          latitude={workflowSession.latitude}
          longitude={workflowSession.longitude}
        />

        <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2">
          <span className="text-teal-300 font-bold block">🔒 Verified Responders Connected</span>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Sharing your current location helps the verified guardian and assigned police patrol coordinate handover safely.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            onClick={() => setIsSharing(!isSharing)}
            variant={isSharing ? "destructive" : "primary"}
            size="sm"
            className="w-full sm:w-auto text-xs"
          >
            {isSharing ? "Stop Location Sharing" : "Resume Location Sharing"}
          </Button>

          <Button
            onClick={() => navigate("/citizen/dashboard")}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto text-xs"
          >
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
