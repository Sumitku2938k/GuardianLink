import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MapPin, Clock, ShieldCheck, Search, Link as LinkIcon, CheckCircle2, XCircle, AlertTriangle, Navigation } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { ReportStatusBadge } from "@/components/citizen/ReportStatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function PoliceFoundReports() {
  const navigate = useNavigate();
  const { foundReports, policeCases, updateCaseStatus, reviewSighting } = usePolice();

  const safeFoundReports = Array.isArray(foundReports) ? foundReports : [];
  const safePoliceCases = Array.isArray(policeCases) ? policeCases : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'verified' | 'dismissed'
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [linkedCaseId, setLinkedCaseId] = useState(safePoliceCases[0]?.id || "");

  const handleLinkReport = async (report) => {
    try {
      await updateCaseStatus(linkedCaseId, "Investigating");
      setFeedback({
        type: "success",
        text: `Report #${report.reportNumber} linked to Case #${linkedCaseId} and case prioritized.`
      });
    } catch (err) {
      setFeedback({ type: "error", text: "Failed to link report to case." });
    }
  };

  const handleOpenReview = (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewNotes("");
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (!selectedReport || !reviewAction) return;
    setIsReviewing(true);
    setFeedback(null);

    try {
      await reviewSighting(selectedReport.id, reviewAction, reviewNotes);
      setFeedback({
        type: "success",
        text: `Report #${selectedReport.reportNumber} marked as ${reviewAction} successfully.`
      });
      setSelectedReport(null);
      setReviewAction(null);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to submit sighting review decision."
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredReports = safeFoundReports.filter((r) => {
    const q = searchQuery.toLowerCase();
    const loc = (r.location || "").toLowerCase();
    const repNum = (r.reportNumber || "").toLowerCase();
    return loc.includes(q) || repNum.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400 shrink-0" />
            <span>Citizen Found Child Reports Queue</span>
          </h1>
          <p className="text-xs text-slate-400">Review sighting reports submitted by citizen helpers with verified officer clearance.</p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by area or ID..."
            className="w-full py-2 px-3 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Reports Queue */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-mono text-xs">
            No citizen found child reports currently in queue matching search.
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-300 text-xs">#{report.reportNumber}</span>
                  <ReportStatusBadge status={report.status} />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{report.date}</span>
              </div>

              <div className="flex items-start gap-4 text-xs">
                {report.photo && (
                  <img src={report.photo} alt="Report Photo" className="w-20 h-20 rounded-xl object-cover ring-2 ring-slate-800 shrink-0" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{report.location}</span>
                  </div>

                  {report.coordinates && (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-mono">
                      <Navigation className="w-3 h-3" />
                      <span>GPS: {report.coordinates.lat?.toFixed(5)}, {report.coordinates.lng?.toFixed(5)} (Authorized Police Access)</span>
                    </div>
                  )}

                  <p className="text-slate-400 text-[11px]">
                    Approx Age: <strong>{report.approxAge}</strong> • Clothing: <strong>{report.clothing}</strong>
                  </p>
                  <span className="text-[10px] text-emerald-400 font-bold block">Safety State: {report.safetyState}</span>
                </div>
              </div>

              {/* Review and Link Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-slate-400 font-mono text-[10px] shrink-0">Link to Case:</span>
                  <select
                    value={linkedCaseId}
                    onChange={(e) => setLinkedCaseId(e.target.value)}
                    className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2.5 py-1 text-xs outline-none"
                  >
                    {safePoliceCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.caseNumber} ({c.childName})
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => handleLinkReport(report)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
                    leftIcon={LinkIcon}
                  >
                    Link
                  </Button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {report.status !== "verified" && (
                    <Button
                      onClick={() => handleOpenReview(report, "verified")}
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      leftIcon={CheckCircle2}
                    >
                      Verify Sighting
                    </Button>
                  )}
                  {report.status !== "dismissed" && (
                    <Button
                      onClick={() => handleOpenReview(report, "dismissed")}
                      variant="outline"
                      size="sm"
                      className="text-xs border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                      leftIcon={XCircle}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sighting Review Modal */}
      <Modal
        isOpen={Boolean(selectedReport && reviewAction)}
        onClose={() => {
          setSelectedReport(null);
          setReviewAction(null);
        }}
        title={
          <div className="flex items-center gap-2 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
            <span>Officer Sighting Review: Report #{selectedReport?.reportNumber}</span>
          </div>
        }
        subtitle={`Decision: ${reviewAction === "verified" ? "Verify Sighting (Credible Lead)" : "Dismiss Sighting (Unrelated / Inaccurate)"}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReview} className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Record your formal assessment for this citizen sighting report. This action is permanently logged to the official investigation audit trail.
          </p>

          <div>
            <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
              Officer Review Findings / Remarks
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. CCTV verified at metro station exit. Squad dispatched for field verification."
              required
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setSelectedReport(null);
                setReviewAction(null);
              }}
              isDisabled={isReviewing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isReviewing}
              className={`font-bold text-white ${
                reviewAction === "verified" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              Confirm {reviewAction === "verified" ? "Verification" : "Dismissal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
