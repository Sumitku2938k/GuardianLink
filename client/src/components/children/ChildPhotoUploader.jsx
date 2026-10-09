import React, { useRef, useState } from "react";
import { Upload, Trash2, Shield, AlertCircle, Cpu, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ChildPhotoUploader = ({
  photo = null,
  photoPreview = null,
  photoFile = null,
  photos = {},
  photoFiles = {},
  onChange
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState("");

  // Resolve current active preview and file (supporting new single-photo props with backward fallbacks)
  const activePreview =
    photoPreview ||
    (typeof photo === "string" ? photo : null) ||
    photos?.front ||
    (typeof photos === "string" ? photos : null) ||
    Object.values(photos || {})[0] ||
    null;

  const validateAndProcessFile = (file) => {
    setLocalError("");
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setLocalError("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError("File size exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (typeof onChange === "function") {
      // Support object payload and backward-compatible positional arguments
      onChange({ photo: file, photoPreview: previewUrl }, { front: file }, { front: previewUrl });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemove = () => {
    if (activePreview && activePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(activePreview);
      } catch {
        // ignore
      }
    }
    setLocalError("");
    if (typeof onChange === "function") {
      onChange({ photo: null, photoPreview: null }, {}, {});
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Photo & Biometric Enrollment</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Upload one clear recent front-facing photo of the child. This photo will be securely stored and used as the reference image for AI facial analysis.
        </p>
      </div>

      {/* Single Large Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center relative transition-all duration-200 ${
          activePreview
            ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
            : dragActive
            ? "border-primary bg-primary/10 shadow-lg scale-[1.01]"
            : "border-gray-200 dark:border-slate-800 hover:border-primary/40 bg-gray-50/50 dark:bg-slate-900/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="child-photo-single-input"
        />

        {activePreview ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full max-w-lg justify-center py-2">
            <div className="relative group shrink-0">
              <img
                src={activePreview}
                alt="Front / Recent Photo"
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-white dark:ring-slate-900 shadow">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> Photo Ready
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Front / Recent Photo</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Clear front-facing photo prepared as the canonical biometric reference image.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={Camera}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace Photo
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  leftIcon={Trash2}
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="child-photo-single-input"
            className="cursor-pointer flex flex-col items-center justify-center w-full py-6 space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-sm">
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Front / Recent Photo
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 block">
                Clear front-facing photo
              </p>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Use a clear photo with one visible face and minimal obstruction.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
              One face • Clear image • JPG / PNG / WEBP (Max 5MB)
            </div>
          </label>
        )}
      </div>

      {localError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Privacy Guard Notice */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed">
          <strong>Privacy Policy Guard:</strong> Photos uploaded are securely processed through GuardianLink's backend storage pipeline and are strictly utilized for safety matching algorithms on verified search requests.
        </p>
      </div>
    </div>
  );
};

export const FaceEnrollmentCard = ({ photos, hasPhoto: propHasPhoto, photoPreview }) => {
  const isEnrolled =
    propHasPhoto ??
    Boolean(
      photoPreview ||
      (typeof photos === "string" && photos.trim().length > 0) ||
      (typeof photos === "object" && photos !== null && Object.keys(photos).length > 0)
    );

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Cpu className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Photo Verification Pipeline</h4>
          <span className="text-[10px] text-gray-400 font-medium">Cloudinary Encrypted Asset Storage</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[90px] text-center py-2">
        {isEnrolled ? (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Shield className="w-4 h-4" /> Photo Asset Prepared for Secure Upload
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              1 reference photograph ready. Photo is persisted via Multer & Cloudinary upon profile submission.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              Profile Photo Pending
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              Please upload one clear front-face photograph to enable facial identification on emergency cases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
