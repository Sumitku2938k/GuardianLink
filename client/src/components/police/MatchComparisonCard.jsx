import React from "react";
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const MatchComparisonCard = ({ caseData, match, onVerifyClick }) => {
  if (!match) return null;

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
      {/* Header Badge */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Vector Match Candidate Review</h4>
            <span className="text-[10px] text-slate-400 font-mono">Flagged: {match.matchDate}</span>
          </div>
        </div>

        <Badge variant="warning" size="sm" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-extrabold">
          AI Similarity: {match.confidenceScore}
        </Badge>
      </div>

      {/* Side by Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        {/* Left: Registered Missing Child */}
        <div className="space-y-3 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold block">
            Target Missing Child Dossier
          </span>
          <div className="flex items-center gap-3">
            <img
              src={caseData.childPhoto}
              alt={caseData.childName}
              className="w-20 h-20 rounded-xl object-cover ring-2 ring-rose-500/40 shrink-0"
            />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-white text-sm">{caseData.childName}</h5>
              <span className="text-slate-400 block">Case #{caseData.caseNumber}</span>
              <span className="text-[11px] text-slate-300 block">Age: {caseData.childAge} yrs • Gender: {caseData.childGender}</span>
              <span className="text-[10px] text-rose-400 font-bold block">Last Seen: {caseData.lastSeenLocation}</span>
            </div>
          </div>
        </div>

        {/* Right: Sighted Candidate Photo */}
        <div className="space-y-3 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider font-bold block">
            Sighted Candidate (CCTV / Citizen Upload)
          </span>
          <div className="flex items-center gap-3">
            <img
              src={match.matchPhoto}
              alt="Sighted Candidate"
              className="w-20 h-20 rounded-xl object-cover ring-2 ring-teal-500/40 shrink-0"
            />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-teal-300 text-sm">Candidate Sighting</h5>
              <span className="text-slate-400 block">Camera: {match.location}</span>
              <span className="text-[11px] text-slate-300 block">Sighting Time: {match.matchDate}</span>
              <span className="text-[10px] text-indigo-400 font-bold block">Match Vector Confidence: {match.confidenceScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Human Officer Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Mandatory Human Decision Principle:</strong> AI confidence ratings provide similarity scores only and do NOT constitute automated identity confirmation. Assigned officers must inspect evidence and issue a formal verification decision.
        </p>
      </div>

      {/* Action CTA */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={() => onVerifyClick(match)}
          variant="primary"
          size="md"
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
          leftIcon={ShieldCheck}
        >
          Perform Officer Match Verification
        </Button>
      </div>
    </div>
  );
};
