import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, Sparkles } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { PhotoCaptureCard } from "@/components/citizen/PhotoCaptureCard";
import { Button } from "@/components/ui/Button";

export default function FoundChildPhoto() {
  const navigate = useNavigate();
  const { workflowSession, setCapturedPhoto } = useCitizen();

  const handleIdentify = () => {
    if (!workflowSession.photoUrl) {
      alert("Please capture or upload a photo before proceeding to identification.");
      return;
    }
    navigate("/citizen/found-child/matching");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <Camera className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Step 2: Photo Capture</h1>
            <p className="text-xs text-gray-500">Provide a photo for AI facial vector matching.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/citizen/found-child")}>
          Back
        </Button>
      </div>

      {/* Photo Capture Card Component */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <PhotoCaptureCard
          photoUrl={workflowSession.photoUrl}
          setPhotoUrl={setCapturedPhoto}
        />
      </motion.div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-slate-800">
        <Button variant="outline" onClick={() => navigate("/citizen/found-child")} leftIcon={ArrowLeft}>
          Previous Step
        </Button>

        <Button
          onClick={handleIdentify}
          variant="primary"
          isDisabled={!workflowSession.photoUrl}
          rightIcon={Sparkles}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
        >
          Identify Child
        </Button>
      </div>
    </div>
  );
}
