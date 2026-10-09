import React, { useState } from "react";
import { Cpu, CheckCircle2, ShieldCheck, Lock, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const PotentialMatchCard = ({ match, onVerify }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleVerifyRequest = async () => {
    setIsRequesting(true);
    try {
      if (onVerify) await onVerify(match.id);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">AI Face Match Candidate</h4>
            <span className="text-[10px] text-gray-400 font-mono">{match.matchDate}</span>
          </div>
        </div>

        <Badge variant="warning" size="sm" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold">
          Confidence: {match.confidenceScore}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Candidate Thumbnail */}
        <div className="relative shrink-0">
          <img
            src={match.matchPhoto}
            alt="Match Candidate"
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/30"
          />
          <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            AI MATCH
          </span>
        </div>

        <div className="space-y-1.5 flex-1 text-center sm:text-left text-xs">
          <p className="font-bold text-gray-900 dark:text-white">
            Detected at: <span className="text-primary">{match.location}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">
            "{match.notes}"
          </p>

          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 text-[10px] text-gray-600 dark:text-slate-300 flex items-center gap-2 mt-2">
            <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Privacy Guard: Candidate identity protected until family verification.</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Status: {match.verificationStatus}
        </span>

        {match.isVerified ? (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Match Verified by Guardian
          </span>
        ) : (
          <Button
            onClick={handleVerifyRequest}
            variant="primary"
            size="sm"
            isLoading={isRequesting}
            leftIcon={ShieldCheck}
            className="w-full sm:w-auto text-xs"
          >
            Confirm & Request Verification
          </Button>
        )}
      </div>
    </div>
  );
};
