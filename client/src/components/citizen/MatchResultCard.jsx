import React from "react";
import { Link } from "react-router-dom";
import { Cpu, ShieldCheck, Lock, ArrowRight, Share2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const MatchResultCard = ({ candidate, onRequestContact, onShareLocation, onReportFallback }) => {
  if (!candidate) return null;

  return (
    <div className="max-w-lg mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl space-y-6">
      {/* Result Header Badge */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Potential Match Detected</h3>
            <span className="text-[10px] text-gray-400 font-mono">Case #{candidate.caseNumber}</span>
          </div>
        </div>

        <Badge variant="warning" size="sm" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-extrabold">
          {candidate.similarityLevel} ({candidate.confidenceScore})
        </Badge>
      </div>

      {/* Candidate Card Body */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50">
        <img
          src={candidate.photo}
          alt={candidate.childName}
          className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shrink-0"
        />

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">{candidate.childName}</h4>
            <span className="text-[10px] text-gray-500">Age ~{candidate.childAge} yrs</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Reported missing from: <strong>{candidate.reportedLocation}</strong>
          </p>
          <span className="inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md mt-1">
            Status: {candidate.verificationStatus}
          </span>
        </div>
      </div>

      {/* Strict Privacy Shield Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] text-slate-300">
          <strong>Privacy Guard Active:</strong> GuardianLink does not reveal private guardian phone numbers or addresses directly to finders. Contact is established through a secure verification proxy request.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onRequestContact}
          variant="primary"
          size="md"
          className="w-full justify-center bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/20"
          leftIcon={ShieldCheck}
        >
          Request Guardian Contact
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={onShareLocation}
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs"
            leftIcon={Share2}
          >
            Share Current Location
          </Button>

          <Button
            onClick={onReportFallback}
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-gray-600 dark:text-gray-300"
            leftIcon={FileText}
          >
            Report as Found Child
          </Button>
        </div>
      </div>
    </div>
  );
};
