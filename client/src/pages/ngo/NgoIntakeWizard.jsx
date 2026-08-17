import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Search,
  Heart,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Upload,
  Building2
} from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { StepIndicator } from "@/components/children/StepIndicator";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const INTAKE_STEPS = ["Case Lookup", "Child Condition", "Initial Assessment", "Documents", "Confirmation"];

export default function NgoIntakeWizard() {
  const navigate = useNavigate();
  const { completeIntake } = useNgo();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRecord, setCreatedRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    caseNumber: "MC-2026-8821",
    childReference: "Kabir Mehta",
    approxAge: 10,
    gender: "Male",
    intakeSource: "Police Escort from Sector 12 Metro",
    policeStation: "Delhi Central Metro Police Post",

    // Step 2: Condition
    visibleInjuries: "None observed",
    medicalNeeded: false,
    emotionalState: "Calm & Reassured",
    immediateNeeds: "Food & Resting Bed",

    // Step 3: Initial Assessment
    physicalState: "Stable",
    foodProvided: true,
    waterProvided: true,
    clothingProvided: true,
    restingAreaProvided: true,
    careNotes: "Child brought by Sub-Inspector. Provided warm dinner and resting space.",

    // Step 4: Documents
    intakeDocUploaded: true,

    // Step 5: Confirmation Checkbox
    isConfirmed: false
  });

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = completeIntake(formData);
    setCreatedRecord(result);
    setIsSuccess(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white flex items-center justify-center gap-2">
          <FileCheck className="w-7 h-7 text-teal-500 dark:text-teal-400 shrink-0" />
          <span>Safe Child Intake Wizard</span>
        </h1>
        <p className="text-xs text-slate-550 dark:text-slate-400">Register arrival of a child brought to NGO shelter by police or citizens.</p>
      </div>

      {!isSuccess ? (
        <>
          {/* Step Indicator */}
          <StepIndicator steps={INTAKE_STEPS} currentStep={currentStep} />

          {/* Form Wizard Body */}
          <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-6 shadow-md">
            {currentStep === 1 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 1: Case Identification & Lookup
                </h3>

                <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-3">
                  <Input
                    label="Search Case Number (e.g. MC-2026-8821) or Found Report ID"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                    required
                  />

                  <Input
                    label="Child Reference / Name (if known)"
                    value={formData.childReference}
                    onChange={(e) => setFormData({ ...formData, childReference: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Approximate Age"
                    type="number"
                    value={formData.approxAge}
                    onChange={(e) => setFormData({ ...formData, approxAge: e.target.value })}
                  />

                  <div>
                    <label className="text-[11px] font-mono text-slate-550 dark:text-slate-400 font-bold uppercase block mb-1">Escort / Intake Source</label>
                    <input
                      type="text"
                      value={formData.intakeSource}
                      onChange={(e) => setFormData({ ...formData, intakeSource: e.target.value })}
                      className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-950 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 2: Child Condition Assessment
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-slate-555 dark:text-slate-400 font-bold uppercase block mb-1">Emotional State</label>
                    <select
                      value={formData.emotionalState}
                      onChange={(e) => setFormData({ ...formData, emotionalState: e.target.value })}
                      className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
                    >
                      <option value="Calm & Reassured" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Calm & Reassured</option>
                      <option value="Anxious - Seeking Family" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Anxious - Seeking Family</option>
                      <option value="Distressed" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Distressed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-555 dark:text-slate-400 font-bold uppercase block mb-1">Medical Assistance Needed?</label>
                    <select
                      value={formData.medicalNeeded ? "Yes" : "No"}
                      onChange={(e) => setFormData({ ...formData, medicalNeeded: e.target.value === "Yes" })}
                      className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
                    >
                      <option value="No" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">No - Stable</option>
                      <option value="Yes" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Yes - Requires Medical Care</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Visible Injuries or Physical Observations"
                  value={formData.visibleInjuries}
                  onChange={(e) => setFormData({ ...formData, visibleInjuries: e.target.value })}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 3: Initial Basic Needs Assessment
                </h3>

                <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">Basic Needs Provided</span>
                  <div className="grid grid-cols-2 gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.foodProvided} readOnly className="accent-teal-555" />
                      <span>Food & Meals Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.waterProvided} readOnly className="accent-teal-555" />
                      <span>Drinking Water Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.clothingProvided} readOnly className="accent-teal-555" />
                      <span>Clean Clothing Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.restingAreaProvided} readOnly className="accent-teal-555" />
                      <span>Resting Dormitory Assigned</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">Staff Care Notes</label>
                  <textarea
                    rows={3}
                    value={formData.careNotes}
                    onChange={(e) => setFormData({ ...formData, careNotes: e.target.value })}
                    className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-950 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 4: Supporting Intake Documents
                </h3>

                <div className="p-6 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950 text-center space-y-2">
                  <Upload className="w-8 h-8 text-teal-500 dark:text-teal-400 mx-auto" />
                  <strong className="block text-slate-800 dark:text-white">Upload Police Escort Form / Medical Slip</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 5: Review & Confirm Intake
                </h3>

                <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-2">
                  <div><span className="text-slate-500 dark:text-slate-400">Case ID:</span> <strong className="text-slate-850 dark:text-white ml-2">{formData.caseNumber}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Child Ref:</span> <strong className="text-teal-650 dark:text-teal-300 ml-2">{formData.childReference}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Intake Source:</span> <strong className="text-slate-850 dark:text-white ml-2">{formData.intakeSource}</strong></div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-650 dark:text-teal-300 pt-2">
                  <input
                    type="checkbox"
                    checked={formData.isConfirmed}
                    onChange={(e) => setFormData({ ...formData, isConfirmed: e.target.value === "on" || e.target.checked })}
                    className="w-4 h-4 accent-teal-500 rounded"
                    required
                  />
                  <span>I confirm that the information recorded above is accurate to the best of my knowledge.</span>
                </label>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex justify-between pt-4 border-t border-gray-150 dark:border-slate-800">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack} leftIcon={ArrowLeft}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <Button type="button" variant="primary" onClick={handleNext} rightIcon={ArrowRight} className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={!formData.isConfirmed}
                  className="bg-emerald-500 text-slate-955 font-bold hover:bg-emerald-400"
                  leftIcon={CheckCircle2}
                >
                  Complete Safe Intake
                </Button>
              )}
            </div>
          </form>
        </>
      ) : (
        /* INTAKE SUCCESS SCREEN */
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white text-center space-y-4 shadow-md">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-slate-850 dark:text-white">Child Successfully Received</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm mx-auto">
            Intake Record <strong>#{createdRecord?.intakeId}</strong> created for <strong>{createdRecord?.childReference}</strong>.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={() => navigate(`/ngo/children/${createdRecord?.id}`)} variant="primary" className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
              View Child Care Record
            </Button>
            <Button onClick={() => navigate("/ngo/dashboard")} variant="outline">
              Return to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
