import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, CheckSquare, Plus, ArrowLeft, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { InvestigationNotesLog } from "@/components/police/InvestigationNotesLog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function PoliceCaseInvestigation() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const {
    getCaseById,
    fetchCaseDetails,
    investigationNotes,
    investigationTasks,
    toggleTask,
    createTask,
    addInvestigationNote
  } = usePolice();

  const caseData = getCaseById(caseId);
  const [loading, setLoading] = useState(!caseData);
  const [fetchError, setFetchError] = useState(null);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    if (!caseData && caseId) {
      setLoading(true);
      fetchCaseDetails(caseId)
        .then(() => setLoading(false))
        .catch((err) => {
          setFetchError(err.message || "Failed to load case record.");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [caseId, caseData, fetchCaseDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading investigation workspace #{caseId}...</span>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-white">Case Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">Case #{caseId} could not be loaded.</p>
        <Button onClick={() => navigate("/police/cases")} className="mt-4">
          Back to Cases
        </Button>
      </div>
    );
  }

  const tasksList = investigationTasks[caseData.id] || [];
  const notesList = investigationNotes[caseData.id] || [];

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    setIsSubmittingTask(true);
    try {
      await createTask(caseData.id, newTaskLabel.trim(), caseData.assignedOfficerName);
      setNewTaskLabel("");
    } catch (err) {
      console.error("[PoliceCaseInvestigation] Error creating task:", err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-400">Case #{caseData.caseNumber}</span>
            <Badge variant="warning" size="sm">{caseData.status}</Badge>
          </div>
          <h1 className="text-2xl font-black text-white">Investigation Workspace: {caseData.childName}</h1>
          <span className="text-xs text-slate-400 block font-mono">Assigned Squad Lead: {caseData.assignedOfficerName}</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate(`/police/cases/${caseData.id}`)} leftIcon={ArrowLeft}>
          Back to Case Dossier
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tasks Checklist (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>Squad Action Checklist ({tasksList.filter((t) => t.completed).length}/{tasksList.length})</span>
              </h3>
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleCreateTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                placeholder="Add new investigation action item..."
                className="flex-1 py-2 px-3 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 outline-none focus:border-blue-500"
              />
              <Button type="submit" variant="primary" size="sm" leftIcon={Plus} className="bg-blue-600 hover:bg-blue-500 text-xs">
                Add Task
              </Button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2 pt-1 text-xs">
              {tasksList.map((t) => (
                <label
                  key={t.id}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    t.completed
                      ? "bg-slate-950/60 border-slate-800/80 text-slate-500 line-through"
                      : "bg-slate-950 border-slate-800 text-white font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(caseData.id, t.id)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>{t.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{t.assignedTo}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Internal Notes (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <InvestigationNotesLog
              caseId={caseData.id}
              notes={notesList}
              onAddNote={addInvestigationNote}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
