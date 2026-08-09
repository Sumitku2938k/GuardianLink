import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Shield,
  Heart,
  User,
  Users,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Phone,
  FileText
} from "lucide-react";
import { useChildren } from "@/context/ChildrenContext";
import { StepIndicator } from "@/components/children/StepIndicator";
import { ChildPhotoUploader, FaceEnrollmentCard } from "@/components/children/ChildPhotoUploader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STEPS = [
  "Basic Info",
  "Photos & AI",
  "Medical Info",
  "Contacts",
  "Review & Submit"
];

export default function AddChild() {
  const navigate = useNavigate();
  const { addChild } = useChildren();

  const [currentStep, setCurrentStep] = useState(1);
  const [enrollmentStatus, setEnrollmentStatus] = useState("Not Started");

  // Step 1: Basic Information
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    nickname: "",
    dob: "",
    gender: "",
    height: "",
    weight: "",
    bloodGroup: "",
    schoolName: "",
    languages: "Hindi, English"
  });

  // Step 2: Photos & Identification
  const [photos, setPhotos] = useState({});
  const [identification, setIdentification] = useState({
    distinctiveMarks: "",
    scars: "",
    birthmarks: "",
    otherMarks: ""
  });

  // Step 3: Medical Information
  const [hasMedicalInfo, setHasMedicalInfo] = useState(false);
  const [medicalInfo, setMedicalInfo] = useState({
    medicalConditions: "",
    allergies: "",
    medications: "",
    doctorName: "",
    doctorContact: "",
    medicalNotes: ""
  });

  // Step 4: Emergency Contacts
  const defaultGuardian = {
    name: "John Doe",
    relationship: "Father/Guardian",
    phone: "+91 98765 43210",
    email: "john.doe@example.com"
  };

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    relationship: "Mother",
    phone: "",
    alternatePhone: "",
    isPrimary: false
  });

  // Authorization Check
  const [authorized, setAuthorized] = useState(false);

  // Errors state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successChild, setSuccessChild] = useState(null);

  // Inline Step Validations
  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!basicInfo.name.trim()) newErrors.name = "Full Name is required";
      if (!basicInfo.dob) newErrors.dob = "Date of Birth is required";
      if (!basicInfo.gender) newErrors.gender = "Gender is required";
    }
    if (step === 2) {
      if (Object.keys(photos).length < 1) {
        newErrors.photos = "Please upload at least one Front Face photograph.";
      }
    }
    if (step === 4) {
      if (emergencyContacts.length === 0) {
        newErrors.contacts = "Please add at least one secondary emergency contact.";
      }
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

  const handleAddContact = () => {
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      alert("Name and phone number are required for emergency contacts.");
      return;
    }
    
    // Check duplicates
    if (emergencyContacts.some((c) => c.phone === contactForm.phone)) {
      alert("A contact with this phone number already exists.");
      return;
    }

    const newContact = {
      ...contactForm,
      id: String(Date.now()),
      isPrimary: emergencyContacts.length === 0 ? true : contactForm.isPrimary
    };

    setEmergencyContacts([...emergencyContacts, newContact]);
    setContactForm({
      name: "",
      relationship: "Mother",
      phone: "",
      alternatePhone: "",
      isPrimary: false
    });
    if (errors.contacts) setErrors({ ...errors, contacts: null });
  };

  const handleRemoveContact = (id) => {
    setEmergencyContacts(emergencyContacts.filter((c) => c.id !== id));
  };

  const handleSubmit = () => {
    if (!authorized) {
      alert("You must authorize the registration to complete profile setup.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const childPayload = {
        name: basicInfo.name,
        nickname: basicInfo.nickname,
        age: calculateAge(basicInfo.dob),
        dob: basicInfo.dob,
        gender: basicInfo.gender,
        height: basicInfo.height || "N/A",
        weight: basicInfo.weight || "N/A",
        bloodGroup: basicInfo.bloodGroup || "N/A",
        schoolName: basicInfo.schoolName || "N/A",
        languages: basicInfo.languages,
        photo: photos.front || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80",
        photos: Object.values(photos),
        faceEnrollmentStatus: enrollmentStatus,
        distinctiveMarks: identification.distinctiveMarks || "None",
        scars: identification.scars || "None",
        birthmarks: identification.birthmarks || "None",
        otherMarks: identification.otherMarks || "None",
        hasMedicalInfo,
        ...medicalInfo,
        emergencyContacts
      };

      const savedChild = addChild(childPayload);
      setSuccessChild(savedChild);
      setIsSubmitting(false);
      setCurrentStep(6); // Success Step
    }, 1500);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Register Child Profile</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Securely register a new safety profile for AI real-time protective tracking.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/parent/children")}>
            Cancel Registration
          </Button>
        </div>
      )}

      {/* Stepper progress */}
      {currentStep < 6 && (
        <StepIndicator currentStep={currentStep} steps={STEPS} />
      )}

      {/* Main wizard cards */}
      <div className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: BASIC INFORMATION */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
            >
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Basic Profile Details</h2>
                  <p className="text-xs text-gray-500">Provide official identity information for the child record.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Aarav Sharma"
                    required
                    icon={User}
                    value={basicInfo.name}
                    onChange={(e) => {
                      setBasicInfo({ ...basicInfo, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: null });
                    }}
                    error={errors.name}
                  />

                  <Input
                    label="Nickname"
                    placeholder="e.g. Aaru"
                    icon={User}
                    value={basicInfo.nickname}
                    onChange={(e) => setBasicInfo({ ...basicInfo, nickname: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    required
                    icon={Calendar}
                    value={basicInfo.dob}
                    onChange={(e) => {
                      setBasicInfo({ ...basicInfo, dob: e.target.value });
                      if (errors.dob) setErrors({ ...errors, dob: null });
                    }}
                    error={errors.dob}
                  />

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={basicInfo.gender}
                      onChange={(e) => {
                        setBasicInfo({ ...basicInfo, gender: e.target.value });
                        if (errors.gender) setErrors({ ...errors, gender: null });
                      }}
                      className={`w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border ${
                        errors.gender ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800"
                      } focus:border-primary outline-none`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && <span className="text-[10px] text-rose-500 font-medium mt-1 block">{errors.gender}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                      Blood Group
                    </label>
                    <select
                      value={basicInfo.bloodGroup}
                      onChange={(e) => setBasicInfo({ ...basicInfo, bloodGroup: e.target.value })}
                      className="w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Height"
                    placeholder="e.g. 128 cm"
                    value={basicInfo.height}
                    onChange={(e) => setBasicInfo({ ...basicInfo, height: e.target.value })}
                  />

                  <Input
                    label="Weight"
                    placeholder="e.g. 26 kg"
                    value={basicInfo.weight}
                    onChange={(e) => setBasicInfo({ ...basicInfo, weight: e.target.value })}
                  />

                  <Input
                    label="Languages Spoken"
                    placeholder="e.g. Hindi, English"
                    value={basicInfo.languages}
                    onChange={(e) => setBasicInfo({ ...basicInfo, languages: e.target.value })}
                  />
                </div>

                <Input
                  label="School Name & Branch"
                  placeholder="e.g. DPS Public School, Sector 45"
                  icon={Shield}
                  value={basicInfo.schoolName}
                  onChange={(e) => setBasicInfo({ ...basicInfo, schoolName: e.target.value })}
                />
              </Card>
            </motion.div>
          )}

          {/* STEP 2: PHOTOS & IDENTIFICATION */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <Card className="p-6 sm:p-8 space-y-6">
                <ChildPhotoUploader photos={photos} onChange={(p) => {
                  setPhotos(p);
                  if (errors.photos) setErrors({ ...errors, photos: null });
                }} />
                {errors.photos && <p className="text-xs text-rose-500 font-semibold">{errors.photos}</p>}

                <FaceEnrollmentCard
                  photos={photos}
                  enrollmentStatus={enrollmentStatus}
                  setEnrollmentStatus={setEnrollmentStatus}
                />
              </Card>

              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Physical Identification Marks</h3>
                  <p className="text-xs text-gray-500">List visible marks that can help search teams identify the child offline.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Distinctive Marks"
                    placeholder="e.g. Mole on left cheek bone"
                    value={identification.distinctiveMarks}
                    onChange={(e) => setIdentification({ ...identification, distinctiveMarks: e.target.value })}
                  />

                  <Input
                    label="Visible Scars"
                    placeholder="e.g. Bicycle scar on right arm"
                    value={identification.scars}
                    onChange={(e) => setIdentification({ ...identification, scars: e.target.value })}
                  />

                  <Input
                    label="Birthmarks"
                    placeholder="e.g. Light patch on right calf"
                    value={identification.birthmarks}
                    onChange={(e) => setIdentification({ ...identification, birthmarks: e.target.value })}
                  />

                  <Input
                    label="Other Identifying Features"
                    placeholder="e.g. Wears black prescription glasses"
                    value={identification.otherMarks}
                    onChange={(e) => setIdentification({ ...identification, otherMarks: e.target.value })}
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: MEDICAL INFORMATION */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
            >
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" />
                      <span>Sensitive Medical Profile</span>
                    </h2>
                    <p className="text-xs text-gray-500">This data is strictly encrypted and used in emergency search protocols.</p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMedicalInfo}
                      onChange={(e) => setHasMedicalInfo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                    <span className="ml-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 select-none">
                      {hasMedicalInfo ? "Active" : "Disabled"}
                    </span>
                  </label>
                </div>

                {hasMedicalInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Medical Conditions"
                        placeholder="e.g. Asthma, Type-1 Diabetes"
                        value={medicalInfo.medicalConditions}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, medicalConditions: e.target.value })}
                      />

                      <Input
                        label="Known Allergies"
                        placeholder="e.g. Peanuts, Penicillin, Dairy"
                        value={medicalInfo.allergies}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, allergies: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Regular Medications"
                        placeholder="e.g. Albuterol Inhaler"
                        value={medicalInfo.medications}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, medications: e.target.value })}
                      />

                      <Input
                        label="Primary Doctor Name"
                        placeholder="Dr. Rajesh Sen"
                        value={medicalInfo.doctorName}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, doctorName: e.target.value })}
                      />

                      <Input
                        label="Doctor Emergency Number"
                        placeholder="+91 99999 88888"
                        icon={Phone}
                        value={medicalInfo.doctorContact}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, doctorContact: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                        Additional Medical Notes
                      </label>
                      <textarea
                        rows={3}
                        value={medicalInfo.medicalNotes}
                        onChange={(e) => setMedicalInfo({ ...medicalInfo, medicalNotes: e.target.value })}
                        placeholder="Describe special treatment directions, blood group confirmation, or hospital preferences..."
                        className="w-full py-2.5 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    Enable the toggle above if your child has chronic medical conditions, medications, or critical allergies that emergency responders should know.
                  </div>
                )}

                <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs flex items-start gap-2">
                  <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Medical Vault Protection:</strong> Medical information is locked under zero-knowledge encryption keys and only made accessible to verified medical responders and police teams upon activation of Red Alert Broadcast.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: GUARDIAN & EMERGENCY CONTACTS */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              {/* Primary Guardian Details */}
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Primary Account Guardian</h2>
                  <p className="text-xs text-gray-500">Auto-filled from your registered account details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40">
                    <span className="text-gray-400 block uppercase font-bold text-[9px]">Guardian Name</span>
                    <span className="text-gray-900 dark:text-white font-bold text-sm mt-0.5 block">{defaultGuardian.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40">
                    <span className="text-gray-400 block uppercase font-bold text-[9px]">Relationship</span>
                    <span className="text-gray-900 dark:text-white font-bold text-sm mt-0.5 block">{defaultGuardian.relationship}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40">
                    <span className="text-gray-400 block uppercase font-bold text-[9px]">Contact Phone</span>
                    <span className="text-gray-900 dark:text-white font-bold text-sm mt-0.5 block">{defaultGuardian.phone}</span>
                  </div>
                </div>
              </Card>

              {/* Secondary Emergency Contacts */}
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Secondary Emergency Contacts</h2>
                  <p className="text-xs text-gray-500">Add trusted family members or neighbors who can act in your absence.</p>
                </div>

                {/* Contacts List Grid */}
                {emergencyContacts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                    {emergencyContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>{contact.name}</span>
                            <Badge variant={contact.isPrimary ? "primary" : "neutral"} size="sm" className="text-[9px]">
                              {contact.relationship}
                            </Badge>
                          </h4>
                          <p className="text-[10px] text-gray-500">{contact.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs border border-dashed rounded-2xl border-gray-200 dark:border-slate-800">
                    No secondary contacts added. Please add at least one helper contact.
                  </div>
                )}
                {errors.contacts && <p className="text-xs text-rose-500 font-semibold">{errors.contacts}</p>}

                {/* Add Contact Form */}
                <div className="p-4 rounded-2xl bg-gray-50/40 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Contact Full Name"
                      placeholder="e.g. Suman Sharma"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    />

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                        Relationship
                      </label>
                      <select
                        value={contactForm.relationship}
                        onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                        className="w-full py-3 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:border-primary outline-none"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Grandparent">Grandparent</option>
                        <option value="Uncle/Aunt">Uncle/Aunt</option>
                        <option value="Neighbor">Neighbor</option>
                        <option value="Teacher">Teacher</option>
                      </select>
                    </div>

                    <Input
                      label="Contact Phone"
                      placeholder="+91 99999 77777"
                      icon={Phone}
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleAddContact}
                      variant="secondary"
                      size="sm"
                      leftIcon={Plus}
                    >
                      Add to Emergency List
                    </Button>
                  </div>
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
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Review Profile Details</h2>
                  <p className="text-xs text-gray-500">Confirm all information is correct before authorizing registry enrollment.</p>
                </div>

                {/* Basic Review */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Basic Information</h3>
                    <button onClick={() => setCurrentStep(1)} className="text-[11px] text-primary font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">Full Name:</span>
                      <strong className="text-gray-900 dark:text-white block mt-0.5">{basicInfo.name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Date of Birth:</span>
                      <strong className="text-gray-900 dark:text-white block mt-0.5">{basicInfo.dob}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Gender:</span>
                      <strong className="text-gray-900 dark:text-white block mt-0.5">{basicInfo.gender}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">School Name:</span>
                      <strong className="text-gray-900 dark:text-white block mt-0.5">{basicInfo.schoolName || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {/* Photos Review */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Photos & Biometrics</h3>
                    <button onClick={() => setCurrentStep(2)} className="text-[11px] text-primary font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(photos).map(([key, url]) => (
                      <div key={key} className="relative text-center">
                        <img src={url} alt={key} className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-slate-800" />
                        <span className="text-[9px] text-gray-400 capitalize block mt-1">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identification Marks Review */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Physical Identification</h3>
                    <button onClick={() => setCurrentStep(2)} className="text-[11px] text-primary font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Distinctive Marks:</span>
                      <p className="text-gray-950 dark:text-white font-semibold mt-0.5">{identification.distinctiveMarks || "None"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Scars/Birthmarks:</span>
                      <p className="text-gray-950 dark:text-white font-semibold mt-0.5">{identification.scars || identification.birthmarks || "None"}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Review */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Medical Summary</h3>
                    <button onClick={() => setCurrentStep(3)} className="text-[11px] text-primary font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                  {hasMedicalInfo ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 block">Conditions:</span>
                        <strong className="text-gray-900 dark:text-white block mt-0.5">{medicalInfo.medicalConditions || "None"}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Allergies:</span>
                        <strong className="text-gray-900 dark:text-white block mt-0.5">{medicalInfo.allergies || "None"}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Doctor:</span>
                        <strong className="text-gray-900 dark:text-white block mt-0.5">{medicalInfo.doctorName || "None"} ({medicalInfo.doctorContact || "N/A"})</strong>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">No chronic medical conditions flagged.</span>
                  )}
                </div>

                {/* Contacts Review */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Emergency Contacts</h3>
                    <button onClick={() => setCurrentStep(4)} className="text-[11px] text-primary font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2">
                    {emergencyContacts.map((c) => (
                      <div key={c.id} className="text-xs flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-slate-800/40">
                        <span className="font-semibold text-gray-900 dark:text-white">{c.name} ({c.relationship})</span>
                        <span className="font-mono text-gray-500">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirmation Authorization Checkbox */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={authorized}
                      onChange={(e) => setAuthorized(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary mt-0.5"
                    />
                    <span className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-semibold">
                      I confirm that the information provided is accurate, I am authorized to register this child, and I consent to GuardianLink indexing biometric features for search matching.
                    </span>
                  </label>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 6: SUCCESS PANEL */}
          {currentStep === 6 && successChild && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="relative inline-block mx-auto">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center ring-8 ring-emerald-500/5 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Child Profile Created Successfully</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                  {successChild.name}'s GuardianLink profile has been successfully created. Biometric indexes are secured and online.
                </p>
              </div>

              {/* ID Badge Card mockup */}
              <div className="max-w-sm mx-auto p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white text-left border border-slate-800 shadow-2xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl" />
                
                <div className="flex items-center gap-3">
                  <img src={successChild.photo} alt={successChild.name} className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/20" />
                  <div>
                    <h3 className="font-bold text-sm">{successChild.name}</h3>
                    <p className="text-[10px] text-slate-300">Guardian ID: {successChild.emergencyPin}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <span>AI INDEX: VERIFIED</span>
                  <span>SAFE ZONE: ACTIVE</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-4">
                <Button
                  onClick={() => navigate(`/parent/children/${successChild.id}`)}
                  variant="primary"
                  className="flex-1 justify-center"
                >
                  View Child Profile
                </Button>
                
                <Button
                  onClick={() => navigate("/parent/children")}
                  variant="outline"
                  className="flex-1 justify-center"
                >
                  Go to My Children
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Controls */}
        {currentStep < 6 && (
          <div className="flex justify-between items-center pt-6 mt-4 border-t border-gray-100 dark:border-slate-800">
            {currentStep > 1 ? (
              <Button
                onClick={handlePrevStep || handlePrev}
                variant="outline"
                leftIcon={ArrowLeft}
                isDisabled={isSubmitting}
              >
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                variant="primary"
                rightIcon={ArrowRight}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                variant="primary"
                isLoading={isSubmitting}
                isDisabled={!authorized}
              >
                Register Child
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
