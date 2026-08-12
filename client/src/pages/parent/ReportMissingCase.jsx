import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Clock,
  User,
  Users,
  FileText,
  Upload,
  Car,
  Shield,
  Eye,
  Sparkles,
  Lock
} from "lucide-react";
import { useChildren } from "@/context/ChildrenContext";
import { useMissingCases } from "@/context/MissingCasesContext";
import { StepIndicator } from "@/components/children/StepIndicator";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { CasePriorityBadge } from "@/components/missing/CasePriorityBadge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STEPS = [
  "Select Child",
  "Last Seen Info",
  "Appearance",
  "Photos & FIR",
  "Review & Submit"
];

export default function ReportMissingCase() {
  const navigate = useNavigate();
  const { children } = useChildren();
  const { createCase, getActiveCaseForChild } = useMissingCases();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [existingActiveCase, setExistingActiveCase] = useState(null);

  // Step 2: Last Seen State
  const [lastSeen, setLastSeen] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "14:30",
    location: "",
    landmark: "",
    activity: "",
    companion: "Alone",
    latitude: "28.6139",
    longitude: "77.2090"
  });

  // Step 3: Appearance & Circumstances
  const [appearance, setAppearance] = useState({
    clothingTop: "",
    clothingBottom: "",
    clothingShoes: "",
    accessories: "",
    height: "",
    hair: "",
    skinTone: "",
    distinctiveMarks: "",
    circumstances: "",
    vehicleInvolved: false,
    vehicleDetails: "",
    priority: "High" // Low, Medium, High, Critical
  });

  // Step 4: Photos & Documents (FIR)
  const [photos, setPhotos] = useState([]);
  const [firAvailable, setFirAvailable] = useState(false);
  const [firData, setFirData] = useState({
    firNumber: "",
    policeStation: "",
    firDate: "",
    firFile: null
  });

  // Step 5: Authorize & Submit State
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState(null);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const handleSelectChild = (childId) => {
    setSelectedChildId(childId);
    const activeCase = getActiveCaseForChild(childId);
    if (activeCase) {
      setExistingActiveCase(activeCase);
    } else {
      setExistingActiveCase(null);
    }
    if (errors.child) setErrors({ ...errors, child: null });
  };

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!selectedChildId) {
        newErrors.child = "Please select a registered child.";
      } else if (existingActiveCase) {
        newErrors.child = "An active case already exists for this child.";
      }
    }
    if (step === 2) {
      if (!lastSeen.location.trim()) newErrors.location = "Last seen location is required.";
      if (!lastSeen.date) newErrors.date = "Last seen date is required.";
      if (!lastSeen.time) newErrors.time = "Last seen time is required.";
    }
    if (step === 3) {
      if (!appearance.clothingTop.trim()) newErrors.clothingTop = "Top clothing description is required.";
      if (!appearance.circumstances.trim()) newErrors.circumstances = "Circumstance description is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmitCase = () => {
    if (!authorized) {
      alert("You must confirm the legal guardian authorization checkbox.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const casePayload = {
        childId: selectedChild.id,
        childName: selectedChild.name,
        childAge: selectedChild.age,
        childGender: selectedChild.gender,
        childPhoto: selectedChild.photo,
        priority: appearance.priority,
        lastSeenDate: lastSeen.date,
        lastSeenTime: lastSeen.time,
        lastSeenLocation: lastSeen.location,
        locationLandmark: lastSeen.landmark,
        latitude: lastSeen.latitude,
        longitude: lastSeen.longitude,
        lastKnownActivity: lastSeen.activity,
        companion: lastSeen.companion,
        clothingTop: appearance.clothingTop,
        clothingBottom: appearance.clothingBottom,
        clothingShoes: appearance.clothingShoes,
        accessories: appearance.accessories,
        height: appearance.height || selectedChild.height,
        hair: appearance.hair,
        skinTone: appearance.skinTone,
        distinctiveMarks: appearance.distinctiveMarks || selectedChild.distinctiveMarks,
        circumstances: appearance.circumstances,
        vehicleInvolved: appearance.vehicleInvolved,
        vehicleDetails: appearance.vehicleDetails,
        firAvailable,
        firNumber: firData.firNumber,
        policeStation: firData.policeStation,
        firDate: firData.firDate
      };

      const result = createCase(casePayload);
      setCreatedCase(result);
      setIsSubmitting(false);
      setCurrentStep(6); // Success Step
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
              <span>Report Missing Child Emergency</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Rapid dispatch wizard to trigger AI CCTV matching and police alert networks.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/parent/missing-cases")}>
            Cancel Report
          </Button>
        </div>
      )}

      {/* Step Indicator */}
      {currentStep < 6 && (
        <StepIndicator currentStep={currentStep} steps={STEPS} />
      )}

      {/* Main Form Box */}
      <div className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT CHILD */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Step 1: Select Registered Child</h2>
                  <p className="text-xs text-gray-500">Choose which child profile to issue the emergency red alert for.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {children.map((c) => {
                    const isSelected = selectedChildId === c.id;
                    const hasActive = getActiveCaseForChild(c.id);

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectChild(c.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 relative ${
                          isSelected
                            ? "border-rose-500 bg-rose-500/5 dark:bg-slate-900 shadow-lg shadow-rose-500/10"
                            : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <img src={c.photo} alt={c.name} className="w-14 h-14 rounded-xl object-cover ring-2 ring-primary/20 shrink-0" />
                        <div className="space-y-0.5 overflow-hidden">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.name}</h4>
                          <span className="text-xs text-gray-500 block">Age: {c.age} yrs • {c.gender}</span>
                          <Badge variant={hasActive ? "danger" : "success"} size="sm" className="text-[9px]">
                            {hasActive ? "Active Case Open" : c.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.child && <p className="text-xs text-rose-500 font-semibold">{errors.child}</p>}

                {/* Duplicate Active Case Warning */}
                {existingActiveCase && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
                      <span>An active missing case already exists for this child!</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      Case <strong>#{existingActiveCase.caseNumber}</strong> is currently open with status <strong>"{existingActiveCase.status}"</strong>. Duplicate red alert creation is blocked.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => navigate(`/parent/missing-cases/${existingActiveCase.id}`)}
                        variant="destructive"
                        size="sm"
                        leftIcon={Eye}
                      >
                        View Existing Case Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* STEP 2: LAST SEEN INFORMATION */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Step 2: Last Seen Details</h2>
                  <p className="text-xs text-gray-500">Provide precise location coordinates for rapid camera search dispatches.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Last Seen Date"
                    type="date"
                    required
                    icon={Clock}
                    value={lastSeen.date}
                    onChange={(e) => setLastSeen({ ...lastSeen, date: e.target.value })}
                    error={errors.date}
                  />

                  <Input
                    label="Last Seen Time"
                    type="time"
                    required
                    icon={Clock}
                    value={lastSeen.time}
                    onChange={(e) => setLastSeen({ ...lastSeen, time: e.target.value })}
                    error={errors.time}
                  />
                </div>

                <Input
                  label="Last Known Location Name / Address"
                  placeholder="e.g. Central Metro Station Exit 3, Sector 12"
                  required
                  icon={MapPin}
                  value={lastSeen.location}
                  onChange={(e) => {
                    setLastSeen({ ...lastSeen, location: e.target.value });
                    if (errors.location) setErrors({ ...errors, location: null });
                  }}
                  error={errors.location}
                />

                <Input
                  label="Nearby Landmark"
                  placeholder="e.g. Opposite Domino's Pizza kiosk"
                  value={lastSeen.landmark}
                  onChange={(e) => setLastSeen({ ...lastSeen, landmark: e.target.value })}
                />

                {/* Interactive Map UI Placeholder */}
                <div className="pt-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    Exact Location on Map UI
                  </label>
                  <MapPlaceholder
                    locationName={lastSeen.location || "Sector 12 Location Pin"}
                    latitude={lastSeen.latitude}
                    longitude={lastSeen.longitude}
                    onSelectLocation={(loc) => {
                      setLastSeen({ ...lastSeen, location: loc.name, latitude: loc.lat, longitude: loc.lng });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Who was the child with?"
                    placeholder="e.g. Alone, Classmates, Caretaker"
                    value={lastSeen.companion}
                    onChange={(e) => setLastSeen({ ...lastSeen, companion: e.target.value })}
                  />

                  <Input
                    label="Last Known Activity"
                    placeholder="e.g. Walking home after tuition class"
                    value={lastSeen.activity}
                    onChange={(e) => setLastSeen({ ...lastSeen, activity: e.target.value })}
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: APPEARANCE & CIRCUMSTANCES */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Clothing & Appearance</h2>
                  <p className="text-xs text-gray-500">Structured details help search units spot children in crowds.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Top Clothing / Shirt"
                    placeholder="e.g. Blue school shirt with navy collar"
                    required
                    value={appearance.clothingTop}
                    onChange={(e) => {
                      setAppearance({ ...appearance, clothingTop: e.target.value });
                      if (errors.clothingTop) setErrors({ ...errors, clothingTop: null });
                    }}
                    error={errors.clothingTop}
                  />

                  <Input
                    label="Bottom Clothing / Pants"
                    placeholder="e.g. Dark grey trousers"
                    value={appearance.clothingBottom}
                    onChange={(e) => setAppearance({ ...appearance, clothingBottom: e.target.value })}
                  />

                  <Input
                    label="Footwear / Shoes"
                    placeholder="e.g. Black leather shoes"
                    value={appearance.clothingShoes}
                    onChange={(e) => setAppearance({ ...appearance, clothingShoes: e.target.value })}
                  />

                  <Input
                    label="Carried Accessories / Bag"
                    placeholder="e.g. Red Adidas school bag"
                    value={appearance.accessories}
                    onChange={(e) => setAppearance({ ...appearance, accessories: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Height"
                    placeholder="e.g. 140 cm"
                    value={appearance.height}
                    onChange={(e) => setAppearance({ ...appearance, height: e.target.value })}
                  />

                  <Input
                    label="Hair Style / Color"
                    placeholder="e.g. Short black hair"
                    value={appearance.hair}
                    onChange={(e) => setAppearance({ ...appearance, hair: e.target.value })}
                  />

                  <Input
                    label="Distinctive Marks"
                    placeholder="e.g. Scar on right forearm"
                    value={appearance.distinctiveMarks}
                    onChange={(e) => setAppearance({ ...appearance, distinctiveMarks: e.target.value })}
                  />
                </div>
              </Card>

              {/* Circumstances & Vehicle */}
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Circumstances & Vehicle Info</h2>
                  <p className="text-xs text-gray-500">Provide details on what happened leading up to the disappearance.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                    What happened? (Detailed Circumstances) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe event timeline, who saw the child last, or suspicious activity..."
                    value={appearance.circumstances}
                    onChange={(e) => {
                      setAppearance({ ...appearance, circumstances: e.target.value });
                      if (errors.circumstances) setErrors({ ...errors, circumstances: null });
                    }}
                    className={`w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border ${
                      errors.circumstances ? "border-rose-500" : "border-gray-200 dark:border-slate-800"
                    } focus:border-rose-500 outline-none resize-none`}
                  />
                  {errors.circumstances && <span className="text-[10px] text-rose-500 font-medium mt-1 block">{errors.circumstances}</span>}
                </div>

                {/* Vehicle Involved Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={appearance.vehicleInvolved}
                      onChange={(e) => setAppearance({ ...appearance, vehicleInvolved: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 accent-rose-600"
                    />
                    <Car className="w-4 h-4 text-rose-500" />
                    <span>Was a suspicious vehicle involved?</span>
                  </label>
                </div>

                {appearance.vehicleInvolved && (
                  <Input
                    label="Vehicle Make, Color & License Plate Number"
                    placeholder="e.g. White Maruti Swift (DL 01 AB 1234)"
                    icon={Car}
                    value={appearance.vehicleDetails}
                    onChange={(e) => setAppearance({ ...appearance, vehicleDetails: e.target.value })}
                  />
                )}

                {/* Priority Selection */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-gray-900 dark:text-white block mb-2">
                    Emergency Priority Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Low", "Medium", "High", "Critical"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAppearance({ ...appearance, priority: p })}
                        className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                          appearance.priority === p
                            ? p === "Critical"
                              ? "bg-red-600 text-white border-red-600 shadow-md"
                              : "bg-rose-500/10 text-rose-600 border-rose-500 shadow-sm"
                            : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {p} Priority
                      </button>
                    ))}
                  </div>

                  {appearance.priority === "Critical" && (
                    <div className="mt-3 p-3 bg-red-600/10 border border-red-600/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>Note: Critical priority triggers immediate phone call dispatch to active police control rooms.</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: PHOTOS & DOCUMENTS */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              {/* Photo Upload Review */}
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Child Photos</h2>
                  <p className="text-xs text-gray-500">Confirm recent photograph to broadcast across CCTV matching feeds.</p>
                </div>

                <div className="flex items-center gap-4">
                  <img src={selectedChild?.photo} alt={selectedChild?.name} className="w-24 h-24 rounded-2xl object-cover ring-4 ring-primary/20 shadow-md" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{selectedChild?.name}</h4>
                    <p className="text-xs text-gray-500">Verified profile photo from GuardianLink vault will be used.</p>
                    <span className="text-[10px] font-bold text-emerald-500 block">✓ Biometric Vector Match Enrolled</span>
                  </div>
                </div>
              </Card>

              {/* Dedicated FIR Section */}
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Police Report / FIR Status</h2>
                  <p className="text-xs text-gray-500">Optionally attach existing police documentation if already filed.</p>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setFirAvailable(true)}
                    className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all ${
                      firAvailable
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 dark:border-slate-800 text-gray-500"
                    }`}
                  >
                    ✓ FIR Available
                  </button>

                  <button
                    type="button"
                    onClick={() => setFirAvailable(false)}
                    className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all ${
                      !firAvailable
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 dark:border-slate-800 text-gray-500"
                    }`}
                  >
                    FIR Not Available Yet
                  </button>
                </div>

                {firAvailable ? (
                  <div className="space-y-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="FIR Number"
                        placeholder="e.g. FIR-492/2026"
                        value={firData.firNumber}
                        onChange={(e) => setFirData({ ...firData, firNumber: e.target.value })}
                      />

                      <Input
                        label="Police Station Name"
                        placeholder="e.g. Central Metro Police Station"
                        value={firData.policeStation}
                        onChange={(e) => setFirData({ ...firData, policeStation: e.target.value })}
                      />

                      <Input
                        label="FIR Filing Date"
                        type="date"
                        value={firData.firDate}
                        onChange={(e) => setFirData({ ...firData, firDate: e.target.value })}
                      />
                    </div>

                    <div className="p-4 border-2 border-dashed rounded-2xl text-center bg-gray-50/50 dark:bg-slate-900/50">
                      <Upload className="w-6 h-6 text-primary mx-auto mb-1" />
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Attach FIR Copy (PDF/JPG)</span>
                      <span className="text-[10px] text-gray-400 block">Mock upload mode</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl text-xs text-gray-500">
                    Police documentation can be added later from the Case Details dashboard after filing with local police.
                  </div>
                )}

                {/* Privacy Notice */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Privacy Notice:</strong> Information submitted through this case is sensitive and will only be shared with authorized police authorities and verified search units involved in the recovery process.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Emergency Report Review</h2>
                  <p className="text-xs text-gray-500">Confirm all details before broadcasting the emergency red alert.</p>
                </div>

                {/* Child Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Selected Child</h3>
                    <button onClick={() => setCurrentStep(1)} className="text-[11px] text-primary font-bold hover:underline">Edit</button>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <img src={selectedChild?.photo} alt={selectedChild?.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <strong className="text-gray-900 dark:text-white block">{selectedChild?.name}</strong>
                      <span className="text-gray-500">{selectedChild?.age} yrs • {selectedChild?.gender}</span>
                    </div>
                  </div>
                </div>

                {/* Last Seen Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Last Seen Details</h3>
                    <button onClick={() => setCurrentStep(2)} className="text-[11px] text-primary font-bold hover:underline">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div><span className="text-gray-400">Location:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{lastSeen.location}</strong></div>
                    <div><span className="text-gray-400">Date/Time:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{lastSeen.date} ({lastSeen.time})</strong></div>
                    <div><span className="text-gray-400">Landmark:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{lastSeen.landmark || "N/A"}</strong></div>
                  </div>
                </div>

                {/* Appearance Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Clothing & Priority</h3>
                    <button onClick={() => setCurrentStep(3)} className="text-[11px] text-primary font-bold hover:underline">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div><span className="text-gray-400">Top Clothing:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{appearance.clothingTop}</strong></div>
                    <div><span className="text-gray-400">Priority:</span> <CasePriorityBadge priority={appearance.priority} /></div>
                    <div><span className="text-gray-400">Vehicle:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{appearance.vehicleInvolved ? appearance.vehicleDetails : "None"}</strong></div>
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={authorized}
                      onChange={(e) => setAuthorized(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 accent-rose-600 mt-0.5"
                    />
                    <span className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-semibold">
                      I confirm that the information provided is accurate to the best of my knowledge and that I am the parent/legal guardian or authorized representative of this child.
                    </span>
                  </label>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 6: EMERGENCY SUBMISSION SUCCESS */}
          {currentStep === 6 && createdCase && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="relative inline-block mx-auto">
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center ring-8 ring-rose-500/10 animate-pulse">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-rose-600 tracking-tight">Missing Child Report Submitted</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                  Your report has been recorded. Authorized authorities can now review and process the case.
                </p>
              </div>

              <div className="max-w-sm mx-auto p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white text-left border border-rose-500/40 shadow-2xl space-y-2">
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Case Number:</span>
                  <strong className="font-mono text-teal-300 font-bold">{createdCase.caseNumber}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Status:</span>
                  <Badge variant="danger" pulse size="sm">Case Active</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Reported Time:</span>
                  <span className="text-slate-200">{createdCase.createdAt}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-4">
                <Button
                  onClick={() => navigate(`/parent/missing-cases/${createdCase.id}`)}
                  variant="destructive"
                  className="flex-1 justify-center"
                >
                  View Case Dashboard
                </Button>
                
                <Button
                  onClick={() => navigate("/parent/missing-cases")}
                  variant="outline"
                  className="flex-1 justify-center"
                >
                  Return to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Navigation */}
        {currentStep < 6 && (
          <div className="flex justify-between items-center pt-6 mt-4 border-t border-gray-100 dark:border-slate-800">
            {currentStep > 1 ? (
              <Button onClick={handlePrev} variant="outline" leftIcon={ArrowLeft} isDisabled={isSubmitting}>
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button onClick={handleNext} variant="primary" rightIcon={ArrowRight}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmitCase}
                variant="destructive"
                isLoading={isSubmitting}
                isDisabled={!authorized}
              >
                Submit Missing Child Report
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
