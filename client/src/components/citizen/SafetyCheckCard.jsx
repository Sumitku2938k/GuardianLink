import React from "react";
import { ShieldCheck, AlertTriangle, PhoneCall, HeartPulse, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const SafetyCheckCard = ({ safetyStatus, setSafetyStatus }) => {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto space-y-2">
        <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Is the child currently safe?
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Please assess the immediate safety of the child before proceeding with identification.
        </p>
      </div>

      {/* Safety Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setSafetyStatus("Safe")}
          className={`p-5 rounded-2xl border-2 text-left transition-all space-y-2 ${
            safetyStatus === "Safe"
              ? "border-teal-500 bg-teal-500/10 dark:bg-slate-900 shadow-md ring-2 ring-teal-500/20"
              : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Yes, Child is Safe</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              In a secure public place with you (mall, station, kiosk).
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSafetyStatus("Medical")}
          className={`p-5 rounded-2xl border-2 text-left transition-all space-y-2 ${
            safetyStatus === "Medical"
              ? "border-amber-500 bg-amber-500/10 dark:bg-slate-900 shadow-md ring-2 ring-amber-500/20"
              : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Needs Medical Help</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Child appears injured, exhausted, or unwell.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSafetyStatus("Danger")}
          className={`p-5 rounded-2xl border-2 text-left transition-all space-y-2 ${
            safetyStatus === "Danger"
              ? "border-rose-600 bg-rose-600/10 dark:bg-slate-900 shadow-md ring-2 ring-rose-600/20"
              : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Immediate Danger</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Threatened by suspicious individual or hostile area.
            </p>
          </div>
        </button>
      </div>

      {/* Emergency Guidance Banner if Danger or Medical is Selected */}
      {(safetyStatus === "Danger" || safetyStatus === "Medical") && (
        <div className="p-5 rounded-2xl bg-rose-950 text-white border-2 border-rose-500/50 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
            <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
            <span>Emergency Action Recommended</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If the child is in immediate danger or requires urgent medical care, call emergency services right away before continuing.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a href="tel:112" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors">
              <PhoneCall className="w-3.5 h-3.5" /> Call Police (112 / 100)
            </a>
            <a href="tel:1098" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-colors">
              <PhoneCall className="w-3.5 h-3.5" /> Call Childline (1098)
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
