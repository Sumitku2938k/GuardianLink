/**
 * GuardianLink — Potential Match Result Card (Phase 6.10)
 *
 * Strict Privacy & Uncertainty Requirements:
 * 1. MUST display "Potential Match" — NEVER "Verified Match" or "Identity Confirmed".
 * 2. Prominent uncertainty disclaimer on every result card.
 * 3. Shows AI similarity rating (HIGH/MEDIUM/LOW) and numeric cosine similarity without
 *    converting it into an identity percentage or probability.
 * 4. Displays only disclosable backend fields: name, age, gender, caseNumber, status,
 *    lastSeenLocation, missingDate, photoUrl, description.
 * 5. Strictly excludes guardian PII, parent contact, medical data, or law enforcement notes.
 */

import React from "react";
import {
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
  ShieldAlert,
  Share2,
  Lock,
  Sparkles,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const MatchResultCard = ({
  candidate,
  onRequestContact,
  onShareLocation,
  onReportSighting
}) => {
  if (!candidate) return null;

  const similarityScore = typeof candidate.similarity === "number"
    ? candidate.similarity.toFixed(4)
    : "N/A";

  const matchConfidence = candidate.matchConfidence || "MEDIUM";

  const confidenceBadgeVariant =
    matchConfidence === "HIGH"
      ? "warning"
      : matchConfidence === "MEDIUM"
      ? "info"
      : "neutral";

  const formattedDate = candidate.missingDate
    ? new Date(candidate.missingDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "Date on record";

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header: Potential Match Badge + Case Number */}
      <div className="flex justify-between items-start gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Potential Match</span>
            </span>

            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              #{candidate.caseNumber || "CASE"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Unverified candidate lead from nationwide active missing cases.
          </p>
        </div>

        <Badge
          variant={confidenceBadgeVariant}
          size="sm"
          className="font-extrabold uppercase shrink-0"
        >
          AI Rating: {matchConfidence} ({similarityScore})
        </Badge>
      </div>

      {/* Mandatory Uncertainty Warning */}
      <div
        role="note"
        aria-label="Unverified AI Match Notice"
        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Notice:</strong> AI similarity results are potential leads, not confirmation of identity. A photograph may match incorrectly. Please do not confront anyone or make assumptions based solely on this result. Follow the official reporting and verification process.
        </p>
      </div>

      {/* Candidate Profile Details */}
      <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50">
        {candidate.photoUrl ? (
          <img
            src={candidate.photoUrl}
            alt={`Reference photograph of ${candidate.name || "Missing Child"}`}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-amber-500/20 shrink-0 mx-auto sm:mx-0"
            onError={(e) => {
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='5'/%3E%3Cpath d='M20 21a8 8 0 1 0-16 0'/%3E%3C/svg%3E";
            }}
          />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
            <span className="text-xs">No Photo</span>
          </div>
        )}

        <div className="space-y-2 text-xs flex-1 w-full">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-lg font-black text-gray-900 dark:text-white">
              {candidate.name || "Child on Record"}
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              Case Status: {candidate.caseStatus || "Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
            <div>
              <span className="text-gray-400 block text-[10px]">Age</span>
              <span className="font-semibold">
                {candidate.age !== null && candidate.age !== undefined
                  ? `${candidate.age} years`
                  : "Not recorded"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Gender</span>
              <span className="font-semibold capitalize">
                {candidate.gender || "Not specified"}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Last seen: {candidate.lastSeenLocation || "Location on record"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Reported missing: {formattedDate}</span>
            </div>
          </div>

          {candidate.description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 italic">
              "{candidate.description}"
            </p>
          )}
        </div>
      </div>

      {/* Privacy Guard Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] text-slate-300">
          <strong>Privacy Safeguard:</strong> GuardianLink does not reveal private family contact numbers or residential addresses. All citizen sighting leads are forwarded to verified law enforcement and NGO case officers.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onReportSighting || onShareLocation}
          variant="primary"
          size="md"
          className="w-full justify-center bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/20"
          leftIcon={ShieldAlert}
        >
          Report Potential Sighting to Authorities
        </Button>

        {onShareLocation && (
          <Button
            onClick={onShareLocation}
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs"
            leftIcon={Share2}
          >
            Share Location with Police Desk
          </Button>
        )}
      </div>
    </div>
  );
};
