import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, MapPin, Clock, Compass, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { ReportStatusBadge } from "@/components/citizen/ReportStatusBadge";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { ChildTimeline } from "@/components/children/ChildTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CitizenReportDetails() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { getReportById, toggleLocationSharing } = useCitizen();

  const report = getReportById(reportId);

  if (!report) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Report Not Found</h3>
        <Button onClick={() => navigate("/citizen/reports")} className="mt-4">
          Back to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-300">Report #{report.reportNumber}</span>
            <ReportStatusBadge status={report.status} />
          </div>
          <h1 className="text-2xl font-black text-white">{report.location}</h1>
          <span className="text-xs text-slate-400 block font-mono">Submitted: {report.date}</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/reports")} leftIcon={ArrowLeft}>
          Back to My Reports
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Sighting Details
            </h3>

            <div className="flex items-start gap-4">
              {report.photo && (
                <img
                  src={report.photo}
                  alt="Sighted Child"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-teal-500/30 shrink-0"
                />
              )}

              <div className="space-y-2 text-xs">
                <div><span className="text-gray-400">Approximate Age:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{report.approxAge} ({report.approxGender})</strong></div>
                <div><span className="text-gray-400">Clothing:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{report.clothing}</strong></div>
                <div><span className="text-gray-400">Safety State:</span> <strong className="text-teal-600 dark:text-teal-400 block mt-0.5">{report.safetyState}</strong></div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">Sighting Location Map</h4>
              <MapPlaceholder
                locationName={report.location}
                latitude={report.latitude}
                longitude={report.longitude}
              />
            </div>
          </Card>

          {/* Location Sharing Controls Card */}
          <Card className="p-6 space-y-3 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white border-teal-500/30">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                <Compass className={`w-5 h-5 ${report.locationSharingActive ? "animate-spin" : ""}`} />
                <span>Live Location Sharing</span>
              </div>
              <Button
                onClick={() => toggleLocationSharing(report.id, !report.locationSharingActive)}
                variant={report.locationSharingActive ? "destructive" : "primary"}
                size="sm"
                className="text-xs"
              >
                {report.locationSharingActive ? "Stop Sharing" : "Start Sharing"}
              </Button>
            </div>
            <p className="text-xs text-slate-300">
              {report.locationSharingActive
                ? "Live GPS signal is active and broadcasting to verified parent & police responders."
                : "Location sharing is currently inactive for this report."}
            </p>
          </Card>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Report Timeline Log
            </h3>
            <ChildTimeline events={report.timeline || []} />
          </Card>
        </div>
      </div>
    </div>
  );
}
