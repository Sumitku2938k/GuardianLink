import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertTriangle, FileText, Cpu, UserCheck, X, ChevronRight } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { Modal } from "@/components/ui/Modal";

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { policeCases, officers } = usePolice();
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const matchingCases = policeCases.filter((c) =>
    c.caseNumber.toLowerCase().includes(query.toLowerCase()) ||
    c.childName.toLowerCase().includes(query.toLowerCase()) ||
    c.lastSeenLocation.toLowerCase().includes(query.toLowerCase())
  );

  const matchingOfficers = officers.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()) ||
    o.badgeNumber.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectCase = (caseId) => {
    onClose();
    navigate(`/police/cases/${caseId}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search Case ID (e.g. MC-2026-8821), Child Name, Location, Officer..."
            className="w-full bg-transparent text-white placeholder-slate-500 outline-none text-sm font-semibold"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {query.trim() === "" ? (
            <div className="text-center py-8 text-slate-500 font-mono">
              Start typing to search across active police records, candidate matches & officers...
            </div>
          ) : (
            <>
              {/* Cases Results */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Missing Cases ({matchingCases.length})
                </span>
                {matchingCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCase(c.id)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={c.childPhoto} alt={c.childName} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{c.childName}</strong>
                          <span className="text-teal-400 font-mono font-bold text-[10px]">{c.caseNumber}</span>
                        </div>
                        <span className="text-slate-400 block text-[11px]">{c.lastSeenLocation}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>

              {/* Officers Results */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Police Officers ({matchingOfficers.length})
                </span>
                {matchingOfficers.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      onClose();
                      navigate("/police/assignments");
                    }}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={o.avatar} alt={o.name} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <strong className="text-white font-bold block">{o.name}</strong>
                        <span className="text-slate-400 block text-[11px]">{o.rank} • {o.badgeNumber}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
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
