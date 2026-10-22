import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const prefillCaseId = searchParams.get("caseId");

  const { completeIntake, referrals, shelters } = useNgo();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdRecord, setCreatedRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    caseId: "",
    caseNumber: "",
    childId: "",
    childReference: "",
    approxAge: 7,
    gender: "Male",
    intakeSource: "Police Escort from Sector 12 Metro",
    policeStation: "Delhi Central Metro Police Post",
    assignedOfficer: "Assigned Police Officer",
    shelterId: shelters[0]?.id || "",

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
    careNotes: "Child brought by escort. Provided warm dinner and safe resting space.",

    // Step 4: Documents
    intakeDocUploaded: true,

    // Step 5: Confirmation Checkbox
    isConfirmed: false
  });

  // Pre-fill if case was selected from referrals or query param
  useEffect(() => {
    if (referrals && referrals.length > 0) {
      let targetCase = null;
      if (prefillCaseId) {
        targetCase = referrals.find((c) => c._id === prefillCaseId || c.id === prefillCaseId || c.caseNumber === prefillCaseId);
      }
      if (!targetCase && !formData.caseId) {
        targetCase = referrals[0];
      }

      if (targetCase && !formData.caseId) {
        setFormData((prev) => ({
          ...prev,
          caseId: targetCase._id || targetCase.id,
          caseNumber: targetCase.caseNumber || `MC-${(targetCase._id || "").slice(-6).toUpperCase()}`,
          childId: targetCase.childId?._id || targetCase.childId?.id || targetCase.childId || "",
          childReference: targetCase.childId?.fullName || targetCase.childId?.name || targetCase.childName || "Child",
          approxAge: targetCase.childId?.age || targetCase.childAge || 7,
          gender: targetCase.childId?.gender || "Male",
          policeStation: targetCase.lastSeenLocation?.city ? `${targetCase.lastSeenLocation.city} Police Station` : "Central Police Post",
          assignedOfficer: targetCase.assignedOfficer?.name || "Assigned Officer",
          shelterId: prev.shelterId || (shelters[0]?.id || "")
        }));
      }
    }
  }, [referrals, prefillCaseId, shelters]);

  const handleSelectReferral = (caseItem) => {
    setFormData((prev) => ({
      ...prev,
      caseId: caseItem._id || caseItem.id,
      caseNumber: caseItem.caseNumber || `MC-${(caseItem._id || "").slice(-6).toUpperCase()}`,
      childId: caseItem.childId?._id || caseItem.childId?.id || caseItem.childId || "",
      childReference: caseItem.childId?.fullName || caseItem.childId?.name || caseItem.childName || "Child",
      approxAge: caseItem.childId?.age || caseItem.childAge || 7,
      gender: caseItem.childId?.gender || "Male",
      policeStation: caseItem.lastSeenLocation?.city ? `${caseItem.lastSeenLocation.city} Police Station` : "Central Police Post",
      assignedOfficer: caseItem.assignedOfficer?.name || "Assigned Officer"
    }));
  };

  const handleNext = () => {
    setErrorMessage("");
    if (currentStep === 1 && !formData.caseId) {
      setErrorMessage("Please select or specify a valid authorized missing case for intake.");
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await completeIntake(formData);
      setCreatedRecord(result);
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to complete intake.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
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

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuccess ? (
        <>
          {/* Step Indicator */}
          <StepIndicator steps={INTAKE_STEPS} currentStep={currentStep} />

          {/* Form Wizard Body */}
          <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-6 shadow-md">
            {currentStep === 1 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 1: Authorized Case Identification & Referral
                </h3>

                {referrals && referrals.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Select From Authorized Case Referrals
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {referrals.map((refCase) => {
                        const isSelected = formData.caseId === (refCase._id || refCase.id);
                        return (
                          <div
                            key={refCase._id || refCase.id}
                            onClick={() => handleSelectReferral(refCase)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-teal-500/15 border-teal-500 dark:border-teal-400 ring-1 ring-teal-500"
                                : "bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 hover:border-teal-400"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono font-bold text-teal-650 dark:text-teal-300 text-[11px]">
                                {refCase.caseNumber || `MC-${(refCase._id || "").slice(-6).toUpperCase()}`}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500">{refCase.status}</span>
                            </div>
                            <strong className="block text-slate-850 dark:text-white text-xs">
                              {refCase.childId?.fullName || refCase.childId?.name || "Child Reference"}
                            </strong>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Age: {refCase.childId?.age || "Unknown"} • {refCase.lastSeenLocation?.city || "Area"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-3">
                  <Input
                    label="Active Case Number (e.g. MC-2026-8821)"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                    required
                  />

                  <Input
                    label="Child Reference / Name"
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

                {shelters && shelters.length > 0 && (
                  <div>
                    <label className="text-[11px] font-mono text-slate-550 dark:text-slate-400 font-bold uppercase block mb-1">
                      Target Shelter Facility
                    </label>
                    <select
                      value={formData.shelterId}
                      onChange={(e) => setFormData({ ...formData, shelterId: e.target.value })}
                      className="w-full py-2.5 px-3 text-xs rounded-xl bg-white dark:bg-slate-950 text-slate-850 dark:text-white border border-gray-200 dark:border-slate-800 outline-none"
                    >
                      {shelters.map((s) => (
                        <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                          {s.name} ({s.available} beds available / {s.totalCapacity} total)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                      <input type="checkbox" checked={formData.foodProvided} onChange={(e) => setFormData({ ...formData, foodProvided: e.target.checked })} className="accent-teal-555" />
                      <span>Food & Meals Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.waterProvided} onChange={(e) => setFormData({ ...formData, waterProvided: e.target.checked })} className="accent-teal-555" />
                      <span>Drinking Water Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.clothingProvided} onChange={(e) => setFormData({ ...formData, clothingProvided: e.target.checked })} className="accent-teal-555" />
                      <span>Clean Clothing Provided</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.restingAreaProvided} onChange={(e) => setFormData({ ...formData, restingAreaProvided: e.target.checked })} className="accent-teal-555" />
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
                  <strong className="block text-slate-850 dark:text-white">Police Escort Memo / Medical Observation Record</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Verified operational documentation on intake</span>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider font-mono">
                  Step 5: Review & Confirm Safe Intake
                </h3>

                <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-2">
                  <div><span className="text-slate-500 dark:text-slate-400">Case ID:</span> <strong className="text-slate-850 dark:text-white ml-2">{formData.caseNumber}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Child Ref:</span> <strong className="text-teal-650 dark:text-teal-300 ml-2">{formData.childReference}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Intake Source:</span> <strong className="text-slate-850 dark:text-white ml-2">{formData.intakeSource}</strong></div>
                  <div><span className="text-slate-500 dark:text-slate-400">Police Escort:</span> <strong className="text-slate-850 dark:text-white ml-2">{formData.assignedOfficer} ({formData.policeStation})</strong></div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-650 dark:text-teal-300 pt-2">
                  <input
                    type="checkbox"
                    checked={formData.isConfirmed}
                    onChange={(e) => setFormData({ ...formData, isConfirmed: e.target.checked })}
                    className="w-4 h-4 accent-teal-500 rounded"
                    required
                  />
                  <span>I confirm that this child has been safely received into NGO temporary shelter care.</span>
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
                  isLoading={isSubmitting}
                  isDisabled={!formData.isConfirmed || isSubmitting}
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
            Intake Record <strong>#{createdRecord?.intakeId}</strong> registered for <strong>{createdRecord?.childReference}</strong> in temporary care.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={() => navigate(`/ngo/children/${createdRecord?.id || createdRecord?._id}`)} variant="primary" className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
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
