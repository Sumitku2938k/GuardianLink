/**
 * GuardianLink — Citizen Photo Search Page (Phase 6.10)
 *
 * Real Backend Integration:
 * - Dispatches multipart photograph to POST /api/citizen/search-missing-child
 * - No mock data, no simulated timers, no fake candidates
 * - Manages explicit states: idle, photo_selected, searching, results, no_results, error
 * - Strict uncertainty messaging: "Potential Match" only — zero claims of verified identity
 * - Retains selected photo across recoverable errors for seamless retry
 * - Revokes Object URLs on photo change or unmount to avoid memory leaks
 * - Prevents double-submissions and supports AbortController cancellation
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Search,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Lock,
  ArrowLeft,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react";
import { PhotoCaptureCard } from "@/components/citizen/PhotoCaptureCard";
import { MatchResultCard } from "@/components/citizen/MatchResultCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { searchMissingChildPhoto, validateSearchPhoto } from "@/services/citizenService";

export default function CitizenPhotoSearch() {
  const navigate = useNavigate();

  // Photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Search execution state
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle"); // 'idle' | 'photo_selected' | 'searching' | 'results' | 'no_results' | 'error'
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Abort controller ref for cancellation
  const abortControllerRef = useRef(null);

  // Clean up object URLs on unmount or replace
  const cleanupPhotoUrl = useCallback(() => {
    if (photoUrl && photoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoUrl);
    }
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      cleanupPhotoUrl();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cleanupPhotoUrl]);

  // Handle photo selection (from file upload or camera)
  const handlePhotoSelected = (file, previewUrl) => {
    cleanupPhotoUrl();

    setPhotoFile(file);
    setPhotoUrl(previewUrl);
    setSearchStatus("photo_selected");
    setSearchError(null);
    setSearchResult(null);
  };

  // Handle photo removal
  const handlePhotoRemoved = () => {
    cleanupPhotoUrl();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setPhotoFile(null);
    setPhotoUrl(null);
    setIsSearching(false);
    setSearchStatus("idle");
    setSearchError(null);
    setSearchResult(null);
  };

  // Execute real backend search
  const handleExecuteSearch = async () => {
    if (!photoFile || isSearching) return;

    // Validate photo client-side before sending
    const validation = validateSearchPhoto(photoFile);
    if (!validation.isValid) {
      setSearchError({
        message: validation.error,
        code: validation.code,
        isRetryable: false
      });
      setSearchStatus("error");
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);
    setSearchStatus("searching");
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await searchMissingChildPhoto({
        photoFile,
        signal: abortController.signal
      });

      setSearchResult(result);

      if (result.matchFound && result.candidates.length > 0) {
        setSearchStatus("results");
      } else {
        setSearchStatus("no_results");
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "REQUEST_CANCELLED") {
        setSearchStatus(photoFile ? "photo_selected" : "idle");
        return;
      }

      setSearchError({
        message: err.message || "An unexpected error occurred while searching.",
        code: err.code || "UNKNOWN_ERROR",
        status: err.status,
        isRetryable: err.isRetryable !== false
      });
      setSearchStatus("error");
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel in-flight search
  const handleCancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearching(false);
    setSearchStatus(photoFile ? "photo_selected" : "idle");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/citizen/dashboard")}
            leftIcon={ArrowLeft}
            className="text-xs"
          >
            Dashboard
          </Button>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
            Citizen Search
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Biometric Photo Search</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Search for a Missing Child
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed mt-1">
              Submit a photograph of a child who appears lost or unaccompanied. Our system performs a privacy-safe similarity search against authoritative active missing cases.
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Uncertainty & Non-Confrontation Advisory Banner */}
      <div
        role="region"
        aria-label="Public Safety Advisory"
        className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-2 shadow-sm"
      >
        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Important Public Safety Advisory</span>
        </div>
        <p className="leading-relaxed">
          AI similarity results are <strong>potential leads only</strong>, not confirmation of identity. A photograph may match incorrectly due to lighting, facial angle, or similarity. <strong>Never confront anyone or make assumptions based on this search.</strong> Follow verified reporting procedures through authorized police and NGO child helplines.
        </p>
      </div>

      {/* Section 1: Photo Input & Preview Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <PhotoCaptureCard
          photoUrl={photoUrl}
          photoFile={photoFile}
          onPhotoSelected={handlePhotoSelected}
          onPhotoRemoved={handlePhotoRemoved}
          isDisabled={isSearching}
        />

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-teal-500" />
            <span>Photograph is processed in memory and never stored permanently.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isSearching && (
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelSearch}
                className="w-full sm:w-auto text-xs"
              >
                Cancel Search
              </Button>
            )}

            <Button
              onClick={handleExecuteSearch}
              variant="primary"
              size="lg"
              isLoading={isSearching}
              isDisabled={!photoFile || isSearching}
              leftIcon={Search}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/20"
            >
              {isSearching ? "Searching Missing Cases..." : "Search for Potential Matches"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Searching In-Flight State */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            role="status"
            aria-live="polite"
            className="p-8 rounded-3xl bg-slate-900 border border-teal-500/40 text-white text-center space-y-4 shadow-xl"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center ring-8 ring-teal-500/10">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Comparing Biometric Facial Landmarks...</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Searching nationwide vector database of active, disclosable missing child reports. Please do not close this window.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 3: Error State */}
      {searchStatus === "error" && searchError && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          aria-live="assertive"
          className="p-6 sm:p-8 rounded-3xl bg-rose-500/10 border border-rose-500/25 text-rose-900 dark:text-rose-200 space-y-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-bold text-rose-700 dark:text-rose-300">
                Search Could Not Be Completed
              </h3>
              <p className="text-xs leading-relaxed text-rose-600 dark:text-rose-300">
                {searchError.message}
              </p>
              {searchError.code && (
                <span className="inline-block text-[10px] font-mono bg-rose-500/20 px-2 py-0.5 rounded text-rose-700 dark:text-rose-300 mt-1">
                  Code: {searchError.code}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {searchError.isRetryable && photoFile && (
              <Button
                onClick={handleExecuteSearch}
                variant="primary"
                size="sm"
                leftIcon={RefreshCw}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Retry Search
              </Button>
            )}

            <Button
              onClick={handlePhotoRemoved}
              variant="outline"
              size="sm"
              className="text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
            >
              Choose Different Photo
            </Button>
          </div>
        </motion.div>
      )}

      {/* Section 4: Eligible Results Found State */}
      {searchStatus === "results" && searchResult?.candidates?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>Potential Matching Leads</span>
                <Badge variant="warning" size="sm">
                  {searchResult.candidates.length} Found
                </Badge>
              </h2>
              <p className="text-xs text-gray-500">
                Matches are ordered by vector similarity against active missing child cases.
              </p>
            </div>

            <Button
              onClick={handlePhotoRemoved}
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              className="text-xs self-start sm:self-auto"
            >
              Search Another Photo
            </Button>
          </div>

          <div className="space-y-6">
            {searchResult.candidates.map((candidate, idx) => (
              <MatchResultCard
                key={candidate.candidateId || idx}
                candidate={candidate}
                onShareLocation={() => navigate("/citizen/found-child/location", { state: { candidate, caseId: candidate.caseId } })}
                onReportSighting={() => navigate("/citizen/found-child/report", { state: { candidate, caseId: candidate.caseId } })}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Section 5: No Eligible Matches Found State */}
      {searchStatus === "no_results" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-center space-y-6 shadow-xl"
        >
          <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              No Eligible Potential Matches Found
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              No active, disclosable missing child cases matched the submitted photograph above the required similarity threshold.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-xs text-gray-500 max-w-lg mx-auto text-left space-y-1.5">
            <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
              What this means:
            </div>
            <div>• This does not prove the child is not missing; a report may not yet have been filed by the family.</div>
            <div>• The child's facial appearance or photo angle may have varied significantly.</div>
            <div>• Submitting an official Sighting Report queues the details for law enforcement review.</div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate("/citizen/found-child/report")}
              variant="primary"
              size="md"
              leftIcon={FileText}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
            >
              Submit Found Child Sighting Report
            </Button>

            <Button
              onClick={handlePhotoRemoved}
              variant="outline"
              size="md"
              leftIcon={RefreshCw}
            >
              Try Another Photograph
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
