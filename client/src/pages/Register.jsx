import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  User,
  Users,
  Building2,
  Lock,
  Mail,
  Phone,
  MapPin,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Award,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ROLES = [
  {
    id: "parent",
    title: "Parent / Guardian",
    desc: "Register children, monitor safe zones, and receive real-time AI security updates.",
    icon: Users,
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "citizen",
    title: "Citizen",
    desc: "Receive emergency missing alerts, upload sightings, and aid local search units.",
    icon: User,
    color: "from-teal-500 to-emerald-600",
  },
  {
    id: "police",
    title: "Police / Law Enforcement",
    desc: "Access official law enforcement dispatch, CCTV feeds, and national registries.",
    icon: Shield,
    color: "from-slate-800 to-slate-950",
  },
  {
    id: "ngo",
    title: "NGO & Child Welfare",
    desc: "Coordinate child welfare programs, shelter sync, and community outreach.",
    icon: Building2,
    color: "from-purple-600 to-pink-600",
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("parent");

  // Step 2 state
  const [personalData, setPersonalData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  // Step 3 state (OTP)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Step 4 state (Profile)
  const [profileData, setProfileData] = useState({
    address: "",
    city: "",
    state: "",
    pinCode: "",
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (currentStep === 3 && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [currentStep, otpTimer]);

  const handleResendOtp = () => {
    setOtpTimer(30);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
  };

  const handleOtpChange = (index, value) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!personalData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!personalData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!personalData.email.trim() || !personalData.email.includes("@")) {
      newErrors.email = "Valid email is required";
    }
    if (!personalData.password || personalData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (personalData.password !== personalData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (!profileData.city.trim()) newErrors.city = "City is required";
    if (!profileData.state.trim()) newErrors.state = "State is required";
    if (!profileData.pinCode.trim()) newErrors.pinCode = "PIN code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (otp.join("").length === 6) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          setCurrentStep(4);
        }, 800);
      } else {
        setErrors({ otp: "Please enter a valid 6-digit OTP code (e.g. 123456)" });
      }
    } else if (currentStep === 4) {
      if (validateStep4()) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          setCurrentStep(5); // Final Success Step
        }, 1200);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep < 5) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setProfileData({ ...profileData, photo: file });
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Navigation Header */}
      <header className="px-6 py-5 flex items-center justify-between z-10 border-b border-gray-100 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-600 to-teal-400 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              GuardianLink
            </span>
            <span className="text-[10px] block font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              Registration Portal
            </span>
          </div>
        </Link>

        <Link
          to="/login"
          className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
        >
          Already registered? <span className="text-primary font-bold">Log In</span>
        </Link>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {/* Step Progress Indicator (1 - 4) */}
        {currentStep < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative max-w-xl mx-auto">
              {/* Line connector */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-teal-400 -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />

              {[
                { step: 1, label: "Role" },
                { step: 2, label: "Details" },
                { step: 3, label: "OTP" },
                { step: 4, label: "Profile" },
              ].map((s) => {
                const isCompleted = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <div key={s.step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        isCompleted
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                          : isCurrent
                          ? "bg-primary text-white ring-4 ring-primary/20 shadow-lg"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-400 border border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : s.step}
                    </div>
                    <span
                      className={`text-xs font-semibold mt-2 ${
                        isCurrent
                          ? "text-primary dark:text-teal-400"
                          : isCompleted
                          ? "text-teal-500"
                          : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-100 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT ROLE */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Step 1: Select Your Role
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose how you wish to contribute to the GuardianLink protection matrix
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;

                    return (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-slate-800/90 shadow-xl shadow-primary/10"
                            : "border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 bg-primary text-white p-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${role.color} text-white flex items-center justify-center mb-3 shadow-md`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {role.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          {role.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: PERSONAL DETAILS */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 max-w-xl mx-auto"
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Step 2: Personal Details
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your official registration information
                  </p>
                </div>

                <Input
                  label="Full Name"
                  placeholder="e.g. John Doe"
                  icon={User}
                  required
                  value={personalData.fullName}
                  onChange={(e) => setPersonalData({ ...personalData, fullName: e.target.value })}
                  error={errors.fullName}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+91 9876543210"
                    icon={Phone}
                    required
                    value={personalData.phone}
                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                    error={errors.phone}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@example.com"
                    icon={Mail}
                    required
                    value={personalData.email}
                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                    error={errors.email}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Create Password"
                    type="password"
                    placeholder="••••••••••••"
                    icon={Lock}
                    required
                    value={personalData.password}
                    onChange={(e) => setPersonalData({ ...personalData, password: e.target.value })}
                    error={errors.password}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••••••"
                    icon={Lock}
                    required
                    value={personalData.confirmPassword}
                    onChange={(e) => setPersonalData({ ...personalData, confirmPassword: e.target.value })}
                    error={errors.confirmPassword}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: OTP VERIFICATION */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-md mx-auto text-center"
              >
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Step 3: OTP Verification
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    We sent a 6-digit security code to{" "}
                    <strong className="text-gray-800 dark:text-gray-200">
                      {personalData.phone || "+91 98765 43210"}
                    </strong>
                  </p>
                </div>

                {/* OTP 6-Digit Box */}
                <div className="flex justify-center gap-2 sm:gap-3 py-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && index > 0) {
                          const prevInput = document.getElementById(`otp-input-${index - 1}`);
                          if (prevInput) prevInput.focus();
                        }
                      }}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  ))}
                </div>

                {errors.otp && (
                  <p className="text-xs text-rose-500 font-semibold">{errors.otp}</p>
                )}

                {/* Resend OTP Timer */}
                <div className="text-xs text-gray-500">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-primary font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                    </button>
                  ) : (
                    <span>Resend code in <strong className="text-primary">{otpTimer}s</strong></span>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: PROFILE COMPLETION */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 max-w-xl mx-auto"
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Step 4: Profile Completion
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Upload your profile photo and address for identity verification
                  </p>
                </div>

                {/* Photo Upload */}
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 hover:border-primary transition-colors">
                  {photoPreview ? (
                    <div className="relative group">
                      <img
                        src={photoPreview}
                        alt="Profile Preview"
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Upload Profile Photo
                      </span>
                      <span className="text-[10px] text-gray-400">JPG, PNG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <Input
                  label="Residential Address"
                  placeholder="Street name, Apartment/House No."
                  icon={MapPin}
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="City"
                    placeholder="e.g. New Delhi"
                    required
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    error={errors.city}
                  />

                  <Input
                    label="State"
                    placeholder="e.g. Delhi"
                    required
                    value={profileData.state}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    error={errors.state}
                  />

                  <Input
                    label="PIN Code"
                    placeholder="110001"
                    required
                    value={profileData.pinCode}
                    onChange={(e) => setProfileData({ ...profileData, pinCode: e.target.value })}
                    error={errors.pinCode}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 5: REGISTRATION SUCCESS */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6 max-w-md mx-auto"
              >
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-teal-500/30 ring-8 ring-teal-500/10">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
                </div>

                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Registration Complete!
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    Welcome to GuardianLink. Your account profile is fully verified and connected to our AI protective network.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl text-left border border-gray-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Account Role:</span>
                    <strong className="capitalize text-primary font-bold">{selectedRole}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Verification Status:</span>
                    <strong className="text-emerald-500 font-bold">✓ Active & Secured</strong>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  rightIcon={ArrowRight}
                >
                  Continue to Parent Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Action Controls */}
          {currentStep < 5 && (
            <div className="flex items-center justify-between pt-8 mt-6 border-t border-gray-100 dark:border-slate-800">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  leftIcon={ArrowLeft}
                  isDisabled={isLoading}
                >
                  Previous
                </Button>
              ) : (
                <div />
              )}

              <Button
                variant="primary"
                onClick={handleNextStep}
                isLoading={isLoading}
                rightIcon={ArrowRight}
              >
                {currentStep === 4 ? "Complete Registration" : "Continue"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 dark:border-slate-800">
        © 2026 GuardianLink Platform. All data is encrypted with SHA-256 Protocol.
      </footer>
    </div>
  );
}
