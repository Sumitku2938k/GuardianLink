import React, { useState } from "react";
import { ShieldCheck, Lightbulb, ChevronRight, ChevronLeft, Lock, PhoneCall, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const SafetyTipsWidget = () => {
  const [currentIdx, setCurrentIdx] = useState(0);

  const tips = [
    {
      title: "Establish a Secret Family Code",
      category: "Emergency Rule",
      icon: Lock,
      desc: "Teach your child a secret password. If someone else ever tries to pick them up, they must ask for this code first.",
      tag: "High Priority",
    },
    {
      title: "Keep Biometric Photos Updated",
      category: "AI Best Practice",
      icon: ShieldCheck,
      desc: "Upload a fresh high-resolution photo every 6 months to ensure optimal AI facial recognition accuracy across CCTV networks.",
      tag: "AI Security",
    },
    {
      title: "Teach Emergency Helpline 1098",
      category: "Child Helpline",
      icon: PhoneCall,
      desc: "Ensure children memorize the nationwide Childline number 1098 and know how to trigger panic alerts on GuardianLink.",
      tag: "Helpline",
    },
  ];

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % tips.length);
  };

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev - 1 + tips.length) % tips.length);
  };

  const currentTip = tips[currentIdx];
  const Icon = currentTip.icon;

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 text-white relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">AI Safety Tips</h4>
            <span className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
              {currentTip.category}
            </span>
          </div>
        </div>

        <Badge variant="secondary" size="sm" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
          {currentTip.tag}
        </Badge>
      </div>

      <div className="my-4 min-h-[90px]">
        <div className="flex items-center gap-2 mb-2 text-teal-400 font-bold text-sm">
          <Icon className="w-4 h-4 shrink-0" />
          <span>{currentTip.title}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          "{currentTip.desc}"
        </p>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
        <span className="text-[11px] text-slate-400 font-mono">
          Tip {currentIdx + 1} of {tips.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};
