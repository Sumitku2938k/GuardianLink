import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, ShieldCheck, CheckCircle2, Sparkles, Database } from "lucide-react";

export const AIProcessingCard = ({ photoUrl, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Image Received & Normalized", icon: Cpu },
    { label: "Face Landmarks Detected", icon: Sparkles },
    { label: "Identity Database Searched", icon: Database },
    { label: "Potential Matches Evaluated", icon: Cpu },
    { label: "Verification Prepared", icon: ShieldCheck }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 800);
          return prev;
        }
      });
    }, 900);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl text-center space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Image Preview with Scanning Animation */}
      <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden ring-4 ring-teal-500/40 shadow-xl">
        <img src={photoUrl} alt="Scanning" className="w-full h-full object-cover" />
        
        {/* Animated Scanning Beam Line */}
        <motion.div
          animate={{ y: ["0%", "100%", "0%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400 shadow-lg shadow-teal-400/50"
        />

        <div className="absolute inset-0 bg-teal-500/10 pointer-events-none" />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-300 animate-spin" />
          <span>AI Facial Recognition Active</span>
        </h3>
        <p className="text-xs text-slate-400">
          Comparing neural facial embeddings against active missing reports...
        </p>
      </div>

      {/* Progress Steps List */}
      <div className="space-y-3 text-left pt-2">
        {steps.map((st, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const StepIcon = st.icon;

          return (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : isCurrent
                    ? "bg-teal-400 text-slate-950 font-bold ring-4 ring-teal-500/30 animate-pulse"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>

              <span
                className={`font-semibold ${
                  isCurrent
                    ? "text-teal-300 font-bold"
                    : isDone
                    ? "text-slate-200"
                    : "text-slate-500"
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
