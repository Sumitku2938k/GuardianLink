import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartHandshake, ShieldAlert, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const FoundChildCTA = ({ onClick }) => {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 border-2 border-teal-500/40 p-6 sm:p-8 shadow-2xl text-white">
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 backdrop-blur-md border border-teal-500/30 text-teal-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-teal-300 animate-pulse" />
            <span>Emergency Found Child Protocol</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 sm:w-10 sm:h-10 text-teal-300 shrink-0" />
            <span>FOUND A CHILD?</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed font-medium">
            Start a secure, 60-second identification and assistance process to help a lost or separated child safely reunite with their guardian.
          </p>
        </div>

        <div className="w-full lg:w-auto shrink-0 flex items-center">
          <Link to="/citizen/found-child" className="w-full sm:w-auto" onClick={onClick}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-center bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-base py-4 px-8 shadow-xl shadow-teal-500/20"
                rightIcon={ArrowRight}
              >
                Start Found Child Protocol
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
};
