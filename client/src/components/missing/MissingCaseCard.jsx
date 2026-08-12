import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  MoreVertical,
  Edit2,
  Clock,
  Download,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle
} from "lucide-react";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { CasePriorityBadge } from "./CasePriorityBadge";
import { Button } from "@/components/ui/Button";

export const MissingCaseCard = ({ item }) => {
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

  const handleDownloadSummary = () => {
    alert(`Downloading Official Summary PDF for Case #${item.caseNumber}...`);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all space-y-4"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Child Header & Info */}
        <div className="flex items-center gap-3.5">
          <img
            src={item.childPhoto}
            alt={item.childName}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {item.childName}
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                {item.caseNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <CaseStatusBadge status={item.status} />
              <CasePriorityBadge priority={item.priority} />
            </div>
          </div>
        </div>

        {/* Police Assignment Status & Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-slate-800">
          <div className="text-left sm:text-right hidden md:block">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Police Assignment</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block truncate max-w-[180px]">
              {item.policeStationName || "Pending Review"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/parent/missing-cases/${item.id}`)}
              variant="primary"
              size="sm"
              leftIcon={Eye}
              className="text-xs"
            >
              View Case
            </Button>

            {/* More Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
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
                        navigate(`/parent/missing-cases/${item.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View Case Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate(`/parent/missing-cases/${item.id}?tab=timeline`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> View Case Timeline
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleDownloadSummary();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-500" /> Download Case Summary
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="truncate">Last Seen: <strong>{item.lastSeenLocation}</strong></span>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Clock className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span>Last Seen Time: <strong>{item.lastSeenDate} ({item.lastSeenTime})</strong></span>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Reported: <strong>{item.createdAt}</strong></span>
        </div>
      </div>
    </motion.div>
  );
};
