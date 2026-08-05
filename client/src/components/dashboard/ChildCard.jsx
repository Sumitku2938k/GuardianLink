import React from "react";
import { motion } from "framer-motion";
import { Shield, MapPin, Eye, Heart, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const ChildCard = ({ child, onViewProfile, onReportMissing }) => {
  const isSafe = child.status === "Protected" || child.status === "Safe";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden transition-all duration-300"
    >
      {/* Background Subtle Gradient Header */}
      <div
        className={`h-24 w-full bg-gradient-to-r ${
          isSafe ? "from-primary/90 via-blue-700 to-teal-600" : "from-rose-600 to-amber-600"
        } relative p-4 flex justify-between items-start`}
      >
        <Badge
          variant={isSafe ? "success" : "danger"}
          pulse={true}
          size="sm"
          className="bg-white/90 backdrop-blur-md shadow-sm border-transparent text-gray-900 font-bold"
        >
          {child.status}
        </Badge>
        <span className="text-[10px] font-mono font-bold bg-black/30 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
          ID: {child.emergencyPin || "GL-9482"}
        </span>
      </div>

      {/* Profile Photo Avatar overlapping header */}
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex justify-between items-end -mt-12 mb-3">
          <div className="relative">
            <img
              src={child.photo}
              alt={child.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-white dark:ring-slate-900">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onViewProfile(child)}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Quick View"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Child Details */}
        <div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{child.name}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
              {child.age} yrs
            </span>
          </h4>

          <div className="mt-2 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span className="truncate">{child.lastLocation || "Modern School Campus, Delhi"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Blood Group: <strong className="text-gray-700 dark:text-gray-200">{child.bloodGroup || "O+"}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex gap-2">
          <Button
            onClick={() => onViewProfile(child)}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            leftIcon={Eye}
          >
            View Profile
          </Button>
          <Button
            onClick={() => onReportMissing(child)}
            variant="destructive"
            size="sm"
            className="text-xs px-3"
            title="Report Emergency"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
