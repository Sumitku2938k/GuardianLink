import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, FileCheck, ArrowLeftRight, X, ChevronRight } from "lucide-react";
import { useNgo } from "@/context/NgoContext";

export const NgoSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { childrenInCare, transfers } = useNgo();
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const matchingChildren = childrenInCare.filter(
    (c) =>
      c.childReference.toLowerCase().includes(query.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(query.toLowerCase()) ||
      c.intakeId.toLowerCase().includes(query.toLowerCase())
  );

  const matchingTransfers = transfers.filter(
    (t) =>
      t.id.toLowerCase().includes(query.toLowerCase()) ||
      t.childReference.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-150 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-955">
          <Search className="w-5 h-5 text-teal-500 dark:text-teal-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Child Ref, Case # (MC-2026-8821), Intake ID, or Transfer ID..."
            className="w-full bg-transparent text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm font-semibold"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {query.trim() === "" ? (
            <div className="text-center py-8 text-slate-500 font-mono">
              Search authorized child care records, intake logs, or shelter transfer requests...
            </div>
          ) : (
            <>
              {/* Children Results */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-550 dark:text-slate-450 font-bold block">
                  Children in Care ({matchingChildren.length})
                </span>
                {matchingChildren.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onClose();
                      navigate(`/ngo/children/${c.id}`);
                    }}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 hover:border-teal-500/50 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={c.photo} alt={c.childReference} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-850 dark:text-white font-bold">{c.childReference}</strong>
                          <span className="text-teal-650 dark:text-teal-400 font-mono font-bold text-[10px]">#{c.intakeId}</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Case #{c.caseNumber} • {c.careStatus}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-550" />
                  </div>
                ))}
              </div>

              {/* Transfer Results */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-550 dark:text-slate-450 font-bold block">
                  Shelter Transfers ({matchingTransfers.length})
                </span>
                {matchingTransfers.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose();
                      navigate("/ngo/transfers");
                    }}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-slate-955 border border-gray-150 dark:border-slate-800 hover:border-teal-500/50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-teal-650 dark:text-teal-400 font-mono text-[11px] block">{t.id}</strong>
                      <span className="text-slate-850 dark:text-white font-bold text-xs">{t.childReference}</span>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">To: {t.toFacility}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-550" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
