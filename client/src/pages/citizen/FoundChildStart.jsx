import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, HeartHandshake } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { SafetyCheckCard } from "@/components/citizen/SafetyCheckCard";
import { Button } from "@/components/ui/Button";

export default function FoundChildStart() {
  const navigate = useNavigate();
  const { workflowSession, setSafetyStatus } = useCitizen();

  const handleContinue = () => {
    navigate("/citizen/found-child/photo");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Found a Child?</h1>
            <p className="text-xs text-gray-500">Let's help them get safely back to their guardian.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/dashboard")}>
          Cancel
        </Button>
      </div>

      {/* Safety Check Assessment */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <SafetyCheckCard
          safetyStatus={workflowSession.childSafeStatus}
          setSafetyStatus={setSafetyStatus}
        />
      </motion.div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-slate-800">
        <Button variant="outline" onClick={() => navigate("/citizen/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>

        <Button
          onClick={handleContinue}
          variant="primary"
          rightIcon={ArrowRight}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
        >
          Continue to Photo Identification
        </Button>
      </div>
    </div>
  );
}
