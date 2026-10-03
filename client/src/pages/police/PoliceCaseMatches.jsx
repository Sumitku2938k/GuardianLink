import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Cpu, ArrowLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { MatchComparisonCard } from "@/components/police/MatchComparisonCard";
import { MatchVerificationModal } from "@/components/police/MatchVerificationModal";
import { Button } from "@/components/ui/Button";

export default function PoliceCaseMatches() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const { getCaseById, potentialMatches, verifyMatchDecision } = usePolice();
  const caseData = getCaseById(caseId);

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-white">Case Not Found</h3>
        <Button onClick={() => navigate("/police/cases")} className="mt-4">
          Back to Cases
        </Button>
      </div>
    );
  }

  const safePotentialMatches = Array.isArray(potentialMatches) ? potentialMatches : [];
  const matches = safePotentialMatches.filter((m) => m.caseId === caseData.id || m.childId === caseData.childId);

  const handleVerifyClick = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-teal-400">Case #{caseData.caseNumber}</span>
          </div>
          <h1 className="text-2xl font-black text-white">AI Potential Matches ({matches.length})</h1>
          <p className="text-xs text-slate-400">Review facial vector candidate matches for {caseData.childName}.</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate(`/police/cases/${caseData.id}`)} leftIcon={ArrowLeft}>
          Back to Case Dossier
        </Button>
      </div>

      {/* Matches List */}
      <div className="space-y-6">
        {matches.length > 0 ? (
          matches.map((m) => (
            <MatchComparisonCard
              key={m.id}
              caseData={caseData}
              match={m}
              onVerifyClick={handleVerifyClick}
            />
          ))
        ) : (
          <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
            <Cpu className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">No AI Vector Matches Flagged Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              CCTV and citizen camera feeds are continuously scanned for matching facial embeddings.
            </p>
          </div>
        )}
      </div>

      {/* Match Verification Modal */}
      <MatchVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        match={selectedMatch}
        onConfirmDecision={(mId, dec, notes) => verifyMatchDecision(caseData.id, mId, dec, notes)}
      />
    </div>
  );
}
