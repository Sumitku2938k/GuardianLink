import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Sparkles
} from "lucide-react";

import { useCitizen } from "@/context/CitizenContext";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function FoundChildReportForm() {
  const navigate = useNavigate();
  const { workflowSession, submitFoundReport } = useCitizen();

  const [formData, setFormData] = useState({
    approxAge: "8 years",
    approxGender: "Male",
    condition: "Healthy & Safe",
    clothing: "Blue T-shirt, navy trousers",
    distinctiveFeatures: "Scar on right wrist",
    notes: "Child was sitting near library reading room alone.",
    location: workflowSession.locationName || "Sector 14 Public Library Kiosk",
    landmark: workflowSession.landmark || "Near Central Metro Exit 3",
    latitude: workflowSession.latitude || "28.6139",
    longitude: workflowSession.longitude || "77.2090"
  });

  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!privacyAgreed) {
      alert("You must acknowledge the privacy & review disclaimer checkbox.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const payload = {
        approxAge: formData.approxAge,
        approxGender: formData.approxGender,
        clothing: formData.clothing,
        location: formData.location,
        landmark: formData.landmark,
        latitude: formData.latitude,
        longitude: formData.longitude,
        safetyState: formData.condition,
        photo: workflowSession.photoUrl || "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80"
      };

      const result = submitFoundReport(payload);
      setSubmittedReport(result);
      setIsSubmitting(false);
    }, 1200);
  };

  if (submittedReport) {
    return (
      <div className="max-w-md mx-auto py-8 text-center space-y-6">
        <div className="w-20 h-20 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Found Child Report Submitted</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Authorized responders can now review the report and attempt to identify or assist the child.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white text-left border border-teal-500/30 shadow-2xl space-y-2">
          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400">Report Number:</span>
            <strong className="font-mono text-teal-300 font-bold">{submittedReport.reportNumber}</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Status:</span>
            <Badge variant="secondary" pulse size="sm">Under Review</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Submission Time:</span>
            <span className="text-slate-200">{submittedReport.date}</span>
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
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Create Found Child Report</h1>
            <p className="text-xs text-gray-500">Quick report for police desk and NGO search queue.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/found-child/result")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
            Basic Child Details
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
                <option value="Unsure">Unsure</option>
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
              Additional Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Child mentioned they were waiting for their mother near tuition center..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 outline-none resize-none"
            />
          </div>
        </Card>

        {/* Location Section */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
            Current Sighting Location
          </h3>

          <Input
            label="Location Name / Address"
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

          <MapPlaceholder
            locationName={formData.location}
            latitude={formData.latitude}
            longitude={formData.longitude}
          />
        </Card>

        {/* Privacy & Review Notice */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-400 accent-teal-500 mt-0.5"
            />
            <span className="text-slate-300 leading-relaxed font-semibold">
              I understand that this report may be reviewed by authorized GuardianLink personnel, police, or verified NGOs for child recovery.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" type="button" onClick={() => navigate("/citizen/found-child/result")}>
            Back
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            isDisabled={!privacyAgreed}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
            leftIcon={FileText}
          >
            Submit Found Child Report
          </Button>
        </div>
      </form>
    </div>
  );
}
