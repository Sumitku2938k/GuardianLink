import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  Eye,
  Edit2,
  Clock,
  Archive,
  User,
  MapPin,
  Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const ChildCard = ({ child, onArchive }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Safe":
        return (
          <Badge variant="success" pulse size="sm" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Safe
          </Badge>
        );
      case "Missing":
        return (
          <Badge variant="danger" pulse size="sm" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
            Missing
          </Badge>
        );
      case "Found":
        return (
          <Badge variant="warning" pulse size="sm" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            Found
          </Badge>
        );
      case "Recovered":
        return (
          <Badge variant="secondary" pulse size="sm" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
            Recovered
          </Badge>
        );
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden transition-all duration-300"
    >
      {/* Background Subtle Gradient Header */}
      <div className="h-28 w-full bg-gradient-to-br from-slate-950 via-slate-900 to-primary/95 relative p-4 flex justify-between items-start">
        {getStatusBadge(child.status)}
        <span className="text-[10px] font-mono font-bold bg-black/40 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
          PIN: {child.emergencyPin}
        </span>
      </div>

      {/* Profile Photo Avatar overlapping header */}
      <div className="px-5 pb-5 relative">
        <div className="flex justify-between items-end -mt-12 mb-3">
          <div className="relative">
            <img
              src={child.photo}
              alt={child.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* More Actions Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 z-30 py-1.5"
                >
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(`/parent/children/${child.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                  >
                    <Eye className="w-4 h-4 text-primary" /> View Profile
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(`/parent/children/${child.id}?edit=true`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                  >
                    <Edit2 className="w-4 h-4 text-teal-500" /> Edit Profile
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(`/parent/children/${child.id}?tab=timeline`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                  >
                    <Clock className="w-4 h-4 text-indigo-500" /> View Timeline
                  </button>

                  <div className="border-t border-gray-100 dark:border-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onArchive(child);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-left"
                  >
                    <Archive className="w-4 h-4" /> Archive Profile
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Child Details */}
        <div className="space-y-1">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="truncate">{child.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 shrink-0">
              {child.age} yrs
            </span>
          </h4>

          <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span className="truncate">{child.lastLocation || "No location recorded"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Blood Group: <strong className="text-gray-700 dark:text-gray-200">{child.bloodGroup || "N/A"}</strong></span>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-slate-800">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Updated: {child.updatedAt}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 flex gap-2">
          <Button
            onClick={() => navigate(`/parent/children/${child.id}`)}
            variant="primary"
            size="sm"
            className="w-full text-xs font-bold py-2 rounded-xl"
            leftIcon={Eye}
          >
            View Profile
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
