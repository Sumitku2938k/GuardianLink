import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  MapPin,
  Clock,
  Compass,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Lock,
  User
} from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { ReportStatusBadge } from "@/components/citizen/ReportStatusBadge";
import { LocationDisplay } from "@/components/common/map/LocationDisplay";
import { ChildTimeline } from "@/components/children/ChildTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CitizenReportDetails() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { getReportById, fetchReportDetails, toggleLocationSharing } = useCitizen();

  const [report, setReport] = useState(() => getReportById(reportId));
  const [loading, setLoading] = useState(() => !getReportById(reportId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReportDetails(reportId);
        if (isMounted) {
          if (data) {
            setReport(data);
          } else {
            setError("Report not found in system records.");
          }
        }
      } catch (err) {
        if (isMounted) {
          const status = err.response?.status;
          if (status === 403) {
            setError("You are not authorized to view this sighting report.");
          } else if (status === 404) {
            setError("Sighting report does not exist or may have been deleted.");
          } else {
            setError(err.message || "Failed to load sighting report details.");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [reportId, fetchReportDetails]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-teal-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Loading Sighting Details...
        </h3>
        <p className="text-xs text-gray-500 font-mono">
          Querying authoritative records for #{reportId}
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white">
          {error || "Report Not Found"}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          {error?.includes("authorized")
            ? "Access to this sighting report is restricted to the reporting citizen and authorized law enforcement responders."
            : "The requested sighting report reference could not be located in database records."}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => navigate("/citizen/reports")} variant="primary" leftIcon={ArrowLeft}>
            Back to My Reports
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            leftIcon={RefreshCw}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasCoords =
    Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-300">
              Report #{report.reportNumber}
            </span>
            <ReportStatusBadge status={report.status} />
          </div>
          <h1 className="text-2xl font-black text-white">{report.location}</h1>
          <span className="text-xs text-slate-400 block font-mono">
            Observed: {report.observedAt || report.date}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/citizen/reports")}
          leftIcon={ArrowLeft}
          className="text-white border-slate-700 hover:bg-slate-800"
        >
          Back to My Reports
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Sighting Observation Details
            </h3>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {report.photo ? (
                <img
                  src={report.photo}
                  alt="Sighted Child"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-teal-500/30 shrink-0 mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                  <User className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-2 text-xs flex-1">
                <div>
                  <span className="text-gray-400">Approximate Age & Gender:</span>
                  <strong className="text-gray-900 dark:text-white block mt-0.5">
                    {report.approxAge} • {report.approxGender}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400">Clothing Description:</span>
                  <strong className="text-gray-900 dark:text-white block mt-0.5">
                    {report.clothing || "Not specified"}
                  </strong>
                </div>
                {report.distinctiveFeatures && (
                  <div>
                    <span className="text-gray-400">Distinctive Features:</span>
                    <strong className="text-gray-900 dark:text-white block mt-0.5">
                      {report.distinctiveFeatures}
                    </strong>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Observed Safety State:</span>
                  <strong className="text-teal-600 dark:text-teal-400 block mt-0.5">
                    {report.safetyState}
                  </strong>
                </div>
              </div>
            </div>

            {report.notes && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs">
                <span className="text-gray-400 block font-bold uppercase text-[10px] mb-1">
                  Observation Narrative
                </span>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {report.notes}
                </p>
              </div>
            )}

            {/* Sighting Location Map */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Sighting Location Map</span>
              </h4>
              {hasCoords ? (
                <LocationDisplay
                  location={{
                    latitude: Number(report.latitude),
                    longitude: Number(report.longitude),
                    address: report.location,
                    type: "sighting",
                    title: `Sighting #${report.reportNumber}`
                  }}
                  height="260px"
                />
              ) : (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-center text-xs text-gray-500 border border-gray-100 dark:border-slate-800">
                  <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {report.location || "Location recorded without GPS coordinates"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Exact coordinates were not captured with this report.
                  </p>
                </div>
              )}
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
                ? "Live GPS signal is active and broadcasting to verified responder units."
                : "Location sharing is currently inactive for this report."}
            </p>
          </Card>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Review Updates Card */}
          {report.reviewNotes && (
            <Card className="p-6 space-y-3 border-teal-500/30 bg-teal-500/5">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Official Police Desk Review</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {report.reviewNotes}
              </p>
              {report.reviewedAt && (
                <span className="text-[10px] text-gray-400 font-mono block">
                  Reviewed: {report.reviewedAt}
                </span>
              )}
            </Card>
          )}

          {/* Privacy Guarantee Notice */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800">
            <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px] uppercase tracking-wide">
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy & Child Safety Notice</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Family contact details and exact residential coordinates are strictly withheld to protect child safety. Formal follow-ups are conducted by investigating police officers and Child Welfare Committees.
            </p>
          </div>

          {/* Timeline Log */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Report Timeline
            </h3>
            <ChildTimeline events={report.timeline || []} />
          </Card>
        </div>
      </div>
    </div>
  );
}
