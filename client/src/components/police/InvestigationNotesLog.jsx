import React, { useState } from "react";
import { FileText, Plus, ShieldCheck, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const InvestigationNotesLog = ({ caseId, notes = [], onAddNote }) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onAddNote(caseId, newNoteText);
      setNewNoteText("");
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Internal Police Investigation Notes ({notes.length})</span>
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">Restricted to Police Personnel</span>
      </div>

      {/* Note Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          placeholder="Add official internal investigation note, dispatch update, or squad finding..."
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 text-white border border-slate-800 focus:border-blue-500 outline-none resize-none text-xs"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            isDisabled={!newNoteText.trim()}
            leftIcon={Plus}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Add Investigation Note
          </Button>
        </div>
      </form>

      {/* Notes Chronological List */}
      <div className="space-y-3 pt-2">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] border-b border-slate-800/60 pb-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <strong className="text-white font-bold">{note.officerName}</strong>
                  <span className="text-slate-500 font-mono">({note.badge})</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px]">{note.time}</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-mono text-[11px] pt-1">
                "{note.text}"
              </p>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-slate-500 italic bg-slate-950/50 rounded-xl border border-slate-900">
            No internal investigation notes recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
