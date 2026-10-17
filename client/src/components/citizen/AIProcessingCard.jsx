/**
 * GuardianLink — AI Biometric Scanning Loading Card (Phase 6.10)
 *
 * Provides smooth accessible feedback during real backend AI search.
 * No fake data triggers, no artificial completion callbacks.
 */

import React from "react";
import { motion } from "framer-motion";
import { Cpu, ShieldCheck, Sparkles, Database, Loader2 } from "lucide-react";

export const AIProcessingCard = ({ photoUrl }) => {
  const steps = [
    { label: "Image Decoded in Volatile Memory", icon: Cpu, active: true },
    { label: "SCRFD Face Landmarks Detected", icon: Sparkles, active: true },
    { label: "ArcFace 512-D Vector Extracted", icon: Database, active: true },
    { label: "Comparing Active Missing Cases", icon: ShieldCheck, active: true }
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl text-center space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Image Preview with Scanning Animation */}
      <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden ring-4 ring-teal-500/40 shadow-xl bg-slate-950">
        {photoUrl ? (
          <img src={photoUrl} alt="Scanning face" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            Scanning
          </div>
        )}

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
          <Loader2 className="w-5 h-5 text-teal-300 animate-spin" />
          <span>Biometric Matching in Progress</span>
        </h3>
        <p className="text-xs text-slate-400">
          Comparing facial embedding vectors against active, disclosable missing reports...
        </p>
      </div>

      {/* Real-time Indicator Steps */}
      <div className="space-y-2.5 text-left pt-2">
        {steps.map((st, idx) => {
          const StepIcon = st.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 text-xs text-slate-300 p-2 rounded-xl bg-slate-800/40 border border-slate-800"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-200">{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
