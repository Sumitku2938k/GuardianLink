import React, { useState } from "react";
import { Upload, Trash2, Shield, AlertCircle, RefreshCcw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const ChildPhotoUploader = ({ photos, onChange }) => {
  const slots = [
    { key: "front", label: "Front Face", desc: "Clear front shot with neutral expression" },
    { key: "left", label: "Left Profile", desc: "Left side profile angle" },
    { key: "right", label: "Right Profile", desc: "Right side profile angle" },
    { key: "smiling", label: "Smiling Face", desc: "Front shot showing emotions" },
    { key: "recent", label: "Recent Photo", desc: "Any clear recent snapshot" }
  ];

  const handleFileChange = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({ ...photos, [key]: url });
    }
  };

  const handleRemove = (key) => {
    const updated = { ...photos };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Photos & Biometric Enrollment</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Please upload clear photographs from different angles for AI feature indexing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {slots.map((slot) => {
          const previewUrl = photos[slot.key];

          return (
            <div
              key={slot.key}
              className={`rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center relative transition-colors min-h-[160px] ${
                previewUrl
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                  : "border-gray-200 dark:border-slate-800 hover:border-primary/40 bg-gray-50/50 dark:bg-slate-900/50"
              }`}
            >
              {previewUrl ? (
                <div className="flex flex-col items-center space-y-2 w-full h-full relative">
                  <img
                    src={previewUrl}
                    alt={slot.label}
                    className="w-20 h-20 rounded-xl object-cover ring-2 ring-emerald-500/20 shadow-md"
                  />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {slot.label} Uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(slot.key)}
                    className="absolute -top-3 -right-3 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      {slot.label}
                    </span>
                    <span className="text-[9px] text-gray-400 block px-2 leading-tight">
                      {slot.desc}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(slot.key, e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-600 dark:text-slate-300 leading-relaxed">
          <strong>Privacy Policy Guard:</strong> Photos uploaded are heavily encrypted using AES-256 standard and are strictly utilized for matching algorithms on verified search requests. They are never indexed publicly or shared with third parties.
        </p>
      </div>
    </div>
  );
};

export const FaceEnrollmentCard = ({ photos, enrollmentStatus, setEnrollmentStatus }) => {
  const [progress, setProgress] = useState(0);

  const totalPhotosCount = Object.keys(photos).length;
  const isEligibleForIndexing = totalPhotosCount >= 3;

  const triggerMockIndexing = () => {
    if (!isEligibleForIndexing) return;
    setEnrollmentStatus("Processing");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setEnrollmentStatus("Completed");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getStatusView = () => {
    switch (enrollmentStatus) {
      case "Completed":
        return (
          <div className="space-y-2 text-center py-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Shield className="w-4 h-4" /> Biometric Identity Enrolled
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Facial landmark models generated successfully. Ready for public scans.
            </p>
          </div>
        );
      case "Processing":
        return (
          <div className="space-y-3 w-full max-w-xs mx-auto py-2">
            <div className="flex justify-between items-center text-xs font-bold text-primary">
              <span className="flex items-center gap-1">
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Vectorizing Face Landmarking...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-teal-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      case "Not Started":
      default:
        return (
          <div className="text-center py-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              Biometric Indexing Pending
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Please upload at least 3 facial profile angles (Recommended: Front, Left, Right) to construct your child's AI identity database profile.
            </p>
            {isEligibleForIndexing && (
              <Button
                onClick={triggerMockIndexing}
                variant="primary"
                size="sm"
                className="mt-3 text-xs"
                leftIcon={Cpu}
              >
                Enroll AI Face Index
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Cpu className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">AI Face Enrollment Shield</h4>
          <span className="text-[10px] text-gray-400 font-medium">Neural Landmark Vector Indexing</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[120px]">
        {getStatusView()}
      </div>
    </div>
  );
};
