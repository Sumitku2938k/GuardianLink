import React, { useState } from "react";
import { Camera, Upload, RefreshCw, Trash2, Shield, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const PhotoCaptureCard = ({ photoUrl, setPhotoUrl }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Default demo child sample photo for instant camera testing
  const demoChildSamplePhoto = "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80";

  const handleSimulateCameraCapture = () => {
    setIsCameraActive(true);
    setTimeout(() => {
      setPhotoUrl(demoChildSamplePhoto);
      setIsCameraActive(false);
    }, 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto space-y-2">
        <div className="w-14 h-14 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Capture or Upload Photo
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Try to capture a clear, front-facing photo if the child is comfortable.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div className="max-w-md mx-auto">
        {photoUrl ? (
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-teal-500/50 shadow-2xl p-4 space-y-4">
            <img
              src={photoUrl}
              alt="Captured Child Photo"
              className="w-full h-64 sm:h-72 rounded-2xl object-cover ring-2 ring-teal-500/30"
            />

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-teal-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Photo Captured
              </span>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPhotoUrl(null)}
                  variant="destructive"
                  size="sm"
                  leftIcon={Trash2}
                  className="text-xs"
                >
                  Remove & Retake
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl border-2 border-dashed border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-6 shadow-sm hover:border-teal-500 transition-colors">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {isCameraActive ? "Activating Camera..." : "Take or Choose a Photo"}
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Front-facing photos provide the highest AI vector matching accuracy.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={handleSimulateCameraCapture}
                variant="primary"
                size="md"
                isLoading={isCameraActive}
                leftIcon={Camera}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
              >
                Use Camera
              </Button>

              <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-2 text-teal-500" /> Upload File
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Photo Guidance Tips & Privacy Disclaimer */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          💡 <strong>Tip:</strong> Do not force or distress the child to obtain a photo.
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] text-slate-300">
            <strong>Privacy Notice:</strong> The photo is used only for GuardianLink's secure neural identification workflow and is never posted publicly on social media or open internet forums.
          </p>
        </div>
      </div>
    </div>
  );
};
