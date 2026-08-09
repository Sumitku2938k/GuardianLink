import React from "react";
import { Check } from "lucide-react";

export const StepIndicator = ({ currentStep, steps }) => {
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-4">
      {/* Progress Bar */}
      <div className="relative flex items-center justify-between">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-teal-400 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Stepper Circles */}
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isActive = currentStep === stepNum;

          return (
            <div key={stepNum} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                  isCompleted
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                    : isActive
                    ? "bg-primary text-white ring-4 ring-primary/20 shadow-lg"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-700"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold mt-2 hidden sm:block ${
                  isActive
                    ? "text-primary dark:text-teal-400 font-bold"
                    : isCompleted
                    ? "text-teal-500"
                    : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile-only Step Description */}
      <div className="text-center mt-3 sm:hidden text-xs font-bold text-primary dark:text-teal-400">
        Step {currentStep} of {steps.length}: {steps[currentStep - 1]}
      </div>
    </div>
  );
};
