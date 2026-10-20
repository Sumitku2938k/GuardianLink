import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Compass,
  Calendar
} from "lucide-react";

import { useCitizen } from "@/context/CitizenContext";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function FoundChildReportForm() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { workflowSession, submitRealSighting, submitFoundReport } = useCitizen();

  // Extract candidate or caseId from router navigation state or workflowSession
  const candidateFromState = routeLocation.state?.candidate || workflowSession.matchedCandidate || null;
  const initialCaseId = routeLocation.state?.caseId || candidateFromState?.caseId || "";

  const [caseId, setCaseId] = useState(initialCaseId);
  const [formData, setFormData] = useState({
    approxAge: candidateFromState?.age ? `${candidateFromState.age} years` : "8 years",
    approxGender: candidateFromState?.gender || "Male",
    condition: "Healthy & Safe",
    clothing: "Blue T-shirt, navy trousers",
    distinctiveFeatures: "",
    notes: "Child was sitting near public kiosk unaccompanied.",
    location: workflowSession.locationName || "Sector 14 Public Library Kiosk",
    landmark: workflowSession.landmark || "Near Central Metro Exit 3",
    latitude: workflowSession.latitude || "28.6139",
    longitude: workflowSession.longitude || "77.2090",
    observedAt: new Date().toISOString().slice(0, 16) // format for datetime-local
  });

  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Optional Geolocation Grab (User explicitly triggers)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        alert(`Unable to retrieve GPS coordinates: ${err.message}. You may enter location manually.`);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate Mandatory Safety Confirmation
    if (!safetyConfirmed) {
      setErrorMessage("You must explicitly confirm the safety instructions before submitting.");
      return;
    }

    if (!formData.notes || !formData.notes.trim()) {
      setErrorMessage("Please provide details of your observation.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        caseId: caseId || undefined,
        description: formData.notes.trim(),
        location: formData.location,
        landmark: formData.landmark,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        approxAge: formData.approxAge,
        approxGender: formData.approxGender,
        clothing: formData.clothing,
        distinctiveFeatures: formData.distinctiveFeatures,
        safetyState: formData.condition,
        observedAt: formData.observedAt ? new Date(formData.observedAt).toISOString() : new Date().toISOString(),
        caseNumber: candidateFromState?.caseNumber,
        childName: candidateFromState?.name,
        photo: candidateFromState?.photoUrl || workflowSession.photoUrl || ""
      };

      let result = null;
      if (caseId && submitRealSighting) {
        // Real Backend Sighting API Call
        result = await submitRealSighting(payload);
      } else {
        // Fallback for standalone demo flow
        result = submitFoundReport(payload);
      }

      setSubmittedReport(result);
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit sighting report. Please check case details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedReport) {
    return (
      <div className="max-w-md mx-auto py-8 text-center space-y-6">
        <div className="w-20 h-20 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Sighting Report Submitted</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Persisted securely. Authorized law enforcement officers and verified guardians have been alerted.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white text-left border border-teal-500/30 shadow-2xl space-y-2">
          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400">Report Reference:</span>
            <strong className="font-mono text-teal-300 font-bold">{submittedReport.reportNumber}</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Review Status:</span>
            <Badge variant="secondary" pulse size="sm">Under Review</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Submission Time:</span>
            <span className="text-slate-200">{submittedReport.date || "Just Now"}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => navigate(`/citizen/reports/${submittedReport.id}`)}
            variant="primary"
            className="flex-1 justify-center bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
          >
            Track Report
          </Button>

          <Button
            onClick={() => navigate("/citizen/dashboard")}
            variant="outline"
            className="flex-1 justify-center"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Submit Sighting Report</h1>
            <p className="text-xs text-gray-500">Authorized alert dispatched to police desk and verified guardians.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/photo-search")}>
          Cancel
        </Button>
      </div>

      {/* Matched Candidate Reference Banner */}
      {candidateFromState ? (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-teal-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide block">
              Reporting for Potential Match: {candidateFromState.name || "Child on Record"}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Active Case Reference: #{candidateFromState.caseNumber || candidateFromState.caseId} • AI Rating: {candidateFromState.matchConfidence || "MEDIUM"}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Target Active Case Reference ID:
          </label>
          <input
            type="text"
            placeholder="Enter MongoDB Case ID (e.g. from photo search)"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-950 text-white border border-slate-800 outline-none font-mono"
          />
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
            Observation Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Approximate Age"
              placeholder="e.g. 8 years"
              value={formData.approxAge}
              onChange={(e) => setFormData({ ...formData, approxAge: e.target.value })}
            />

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                Approximate Gender
              </label>
              <select
                value={formData.approxGender}
                onChange={(e) => setFormData({ ...formData, approxGender: e.target.value })}
                className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Unsure">Unsure</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-500" />
                <span>Observation Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={formData.observedAt}
                onChange={(e) => setFormData({ ...formData, observedAt: e.target.value })}
                className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                Child Safety Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
              >
                <option value="Healthy & Safe">Healthy & Safe</option>
                <option value="Appears Lost / Distressed">Appears Lost / Distressed</option>
                <option value="Accompanied by Unknown Adult">Accompanied by Unknown Adult</option>
                <option value="Needs Medical Attention">Needs Medical Attention</option>
              </select>
            </div>
          </div>

          <Input
            label="Clothing Description"
            placeholder="e.g. Blue T-shirt, navy trousers, red sneakers"
            value={formData.clothing}
            onChange={(e) => setFormData({ ...formData, clothing: e.target.value })}
          />

          <Input
            label="Distinctive Features / Scars / Marks"
            placeholder="e.g. Birthmark on left neck, glasses"
            value={formData.distinctiveFeatures}
            onChange={(e) => setFormData({ ...formData, distinctiveFeatures: e.target.value })}
          />

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              Observation Details & Specific Circumstances *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe where and how you observed the child (e.g. waiting alone near bus stand, moving toward metro gate)..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 outline-none resize-none"
            />
          </div>
        </Card>

        {/* Location Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Sighting Location
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              isLoading={gpsLoading}
              leftIcon={Compass}
              className="text-xs"
            >
              Use My Current GPS Point
            </Button>
          </div>

          <Input
            label="Location Description / Address *"
            placeholder="e.g. Sector 14 Public Library Kiosk"
            required
            icon={MapPin}
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Input
            label="Nearby Landmark"
            placeholder="e.g. Near Metro Exit 3"
            value={formData.landmark}
            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude (Optional)"
              placeholder="e.g. 28.6139"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            />
            <Input
              label="Longitude (Optional)"
              placeholder="e.g. 77.2090"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            />
          </div>

          <MapPlaceholder
            locationName={formData.location}
            latitude={formData.latitude}
            longitude={formData.longitude}
          />
        </Card>

        {/* Mandatory Safety Instructions & Citizen Confirmation */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-2 font-black uppercase text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Mandatory Public Safety Confirmation</span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              required
              checked={safetyConfirmed}
              onChange={(e) => setSafetyConfirmed(e.target.checked)}
              className="w-5 h-5 rounded border-amber-400 text-teal-500 focus:ring-teal-400 accent-teal-500 mt-0.5"
            />
            <span className="leading-relaxed font-semibold">
              I understand that a potential facial match is not confirmation of identity. I will not confront, detain, follow, or physically intervene with anyone. I will provide truthful observations and allow authorized responders to assess the information.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" type="button" onClick={() => navigate("/citizen/photo-search")}>
            Back
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            isDisabled={!safetyConfirmed}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none shadow-lg shadow-teal-500/20"
            leftIcon={FileText}
          >
            Submit Sighting to Responders
          </Button>
        </div>
      </form>
    </div>
  );
}
