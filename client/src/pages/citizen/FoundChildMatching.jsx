import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCitizen } from "@/context/CitizenContext";
import { AIProcessingCard } from "@/components/citizen/AIProcessingCard";

export default function FoundChildMatching() {
  const navigate = useNavigate();
  const { workflowSession, runAIMatching } = useCitizen();

  useEffect(() => {
    if (!workflowSession.photoUrl) {
      navigate("/citizen/found-child/photo");
    }
  }, [workflowSession.photoUrl, navigate]);

  const handleCompleteMatching = () => {
    runAIMatching(false); // Runs simulation returning candidate Kabir Mehta
    navigate("/citizen/found-child/result");
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <AIProcessingCard
        photoUrl={workflowSession.photoUrl || "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80"}
        onComplete={handleCompleteMatching}
      />
    </div>
  );
}
