import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  searchMissingChildPhoto,
  submitSightingReport,
  getMySightings,
  getSightingDetails,
  getUserNotifications,
  getNearbyFacilities
} from "@/services/citizenService";

const CitizenContext = createContext();

export const useCitizen = () => {
  const context = useContext(CitizenContext);
  if (!context) {
    throw new Error("useCitizen must be used within a CitizenProvider");
  }
  return context;
};

/**
 * Normalizes backend Sighting model to consistent client UI object
 */
export function normalizeSightingForUi(s) {
  if (!s) return null;
  const id = (s._id || s.id || "").toString();
  const reportNumber = s.reportNumber || (id ? `SR-${id.slice(-6).toUpperCase()}` : "SR-PENDING");

  let statusLabel = "Under Review";
  if (s.status === "verified") statusLabel = "Verified";
  else if (s.status === "dismissed") statusLabel = "Resolved";
  else if (s.status === "submitted" || s.status === "under_review") statusLabel = "Under Review";

  const loc = s.location || {};
  const locationString =
    loc.address ||
    [loc.landmark, loc.city, loc.state].filter(Boolean).join(", ") ||
    "Location on record";

  const child = s.childId && typeof s.childId === "object" ? s.childId : {};
  const kase = s.caseId && typeof s.caseId === "object" ? s.caseId : {};

  return {
    id,
    _id: id,
    reportNumber,
    rawStatus: s.status || "submitted",
    status: statusLabel,
    date: s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just Now",
    observedAt: s.observedAt
      ? new Date(s.observedAt).toLocaleString()
      : s.createdAt
      ? new Date(s.createdAt).toLocaleString()
      : "Recently",
    location: locationString,
    rawLocation: loc,
    landmark: loc.landmark || "",
    latitude: loc.latitude !== undefined && loc.latitude !== null ? Number(loc.latitude) : undefined,
    longitude: loc.longitude !== undefined && loc.longitude !== null ? Number(loc.longitude) : undefined,
    accuracy: loc.accuracy,
    source: loc.source || "manual",
    approxAge: s.appearance?.approxAge || "Not recorded",
    approxGender: s.appearance?.approxGender || "Not specified",
    clothing: s.appearance?.clothing || "Not specified",
    distinctiveFeatures: s.appearance?.distinctiveFeatures || "",
    notes: s.description || "",
    safetyState: s.safetyState || "Safe",
    reviewNotes: s.reviewNotes || "",
    reviewedAt: s.reviewedAt ? new Date(s.reviewedAt).toLocaleString() : null,
    photo: s.photo || child.photoUrl || "",
    matchedCaseId: kase.caseNumber || (kase._id ? `MC-${kase._id.toString().slice(-6).toUpperCase()}` : null),
    matchedChildName: child.fullName || null,
    timeline: [
      {
        title: "Sighting Report Filed",
        time: s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just Now",
        desc: `Report registered by citizen helper. Review status: ${s.status || "submitted"}.`
      },
      ...(s.reviewedAt
        ? [
            {
              title: `Report Review: ${statusLabel}`,
              time: new Date(s.reviewedAt).toLocaleString(),
              desc: s.reviewNotes || `Status updated to ${statusLabel} by law enforcement.`
            }
          ]
        : [])
    ]
  };
}

export const CitizenProvider = ({ children }) => {
  // Database-backed Sighting records
  const [foundReports, setFoundReports] = useState([]);
  const [isLoadingSightings, setIsLoadingSightings] = useState(false);
  const [sightingsError, setSightingsError] = useState(null);

  // Real Notifications from API
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Registered Assistance Facilities (Shelters & Support Units)
  const [facilities, setFacilities] = useState([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);

  // Active Found Child Workflow Session State
  const [workflowSession, setWorkflowSession] = useState({
    childSafeStatus: "Safe", // Safe, Medical, Danger
    photoUrl: null,
    photoFile: null,
    locationName: "",
    landmark: "",
    latitude: "",
    longitude: "",
    isSearching: false,
    aiResult: null, // null | 'match_found' | 'no_match' | 'error'
    candidates: [],
    matchedCandidate: null,
    searchOutcome: null,
    searchError: null,
    locationSharingActive: false
  });

  // Start Found Workflow (reset state cleanly)
  const startFoundWorkflow = () => {
    setWorkflowSession((prev) => {
      if (prev.photoUrl && prev.photoUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.photoUrl);
        } catch (_) {}
      }
      return {
        childSafeStatus: "Safe",
        photoUrl: null,
        photoFile: null,
        locationName: "",
        landmark: "",
        latitude: "",
        longitude: "",
        isSearching: false,
        aiResult: null,
        candidates: [],
        matchedCandidate: null,
        searchOutcome: null,
        searchError: null,
        locationSharingActive: false
      };
    });
  };

  // Set Safety Status
  const setSafetyStatus = (status) => {
    setWorkflowSession((prev) => ({ ...prev, childSafeStatus: status }));
  };

  // Set Photo (file or URL)
  const setCapturedPhoto = (photoFileOrUrl, optionalUrl) => {
    let file = null;
    let url = null;

    if (typeof photoFileOrUrl === "string") {
      url = photoFileOrUrl;
    } else if (photoFileOrUrl instanceof Blob || photoFileOrUrl instanceof File) {
      file = photoFileOrUrl;
      url = optionalUrl || URL.createObjectURL(photoFileOrUrl);
    }

    setWorkflowSession((prev) => {
      if (prev.photoUrl && prev.photoUrl.startsWith("blob:") && prev.photoUrl !== url) {
        try {
          URL.revokeObjectURL(prev.photoUrl);
        } catch (_) {}
      }
      return {
        ...prev,
        photoFile: file,
        photoUrl: url,
        aiResult: null,
        candidates: [],
        matchedCandidate: null,
        searchError: null
      };
    });
  };

  // Run Real AI Matching via Backend Service
  const runAIMatching = async (customFile = null, options = {}) => {
    const fileToSearch = customFile || workflowSession.photoFile;

    if (!fileToSearch) {
      const err = new Error("No photograph file provided for biometric search.");
      setWorkflowSession((prev) => ({
        ...prev,
        aiResult: "error",
        searchError: err.message,
        matchedCandidate: null,
        candidates: []
      }));
      throw err;
    }

    setWorkflowSession((prev) => ({
      ...prev,
      isSearching: true,
      aiResult: null,
      searchError: null
    }));

    try {
      const outcome = await searchMissingChildPhoto({
        photoFile: fileToSearch,
        ...options
      });

      const firstCandidate = outcome.candidates?.[0] || null;
      const aiResult = outcome.matchFound && outcome.candidates.length > 0 ? "match_found" : "no_match";

      setWorkflowSession((prev) => ({
        ...prev,
        isSearching: false,
        aiResult,
        candidates: outcome.candidates || [],
        matchedCandidate: firstCandidate,
        searchOutcome: outcome,
        searchError: null
      }));

      return aiResult;
    } catch (err) {
      setWorkflowSession((prev) => ({
        ...prev,
        isSearching: false,
        aiResult: "error",
        searchError: err.message || "Search failed.",
        candidates: [],
        matchedCandidate: null
      }));
      throw err;
    }
  };

  // Load sighting reports submitted by the citizen
  const loadCitizenSightings = useCallback(async () => {
    setIsLoadingSightings(true);
    setSightingsError(null);
    try {
      const realSightings = await getMySightings();
      if (Array.isArray(realSightings)) {
        const formatted = realSightings.map(normalizeSightingForUi).filter(Boolean);
        setFoundReports(formatted);
      }
    } catch (err) {
      console.warn("[CitizenContext] Could not load sightings:", err.message);
      setSightingsError(err.message || "Failed to load sightings.");
    } finally {
      setIsLoadingSightings(false);
    }
  }, []);

  // Load real notifications from backend
  const loadCitizenNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const realNotifs = await getUserNotifications();
      if (Array.isArray(realNotifs)) {
        setNotifications(
          realNotifs.map((n) => ({
            id: n._id || n.id,
            title: n.title,
            message: n.message,
            time: n.createdAt
              ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Recently",
            isRead: n.isRead,
            type:
              n.type === "sighting_reported"
                ? "info"
                : n.type === "sighting_reviewed"
                ? "success"
                : "warning"
          }))
        );
      }
    } catch (err) {
      console.warn("[CitizenContext] Could not load notifications:", err.message);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // Load registered assistance facilities
  const loadNearbyFacilities = useCallback(async () => {
    setIsLoadingFacilities(true);
    try {
      const list = await getNearbyFacilities();
      setFacilities(list);
    } catch (err) {
      console.warn("[CitizenContext] Could not load facilities:", err.message);
      setFacilities([]);
    } finally {
      setIsLoadingFacilities(false);
    }
  }, []);

  // Direct fetch single sighting from API (guarantees direct URL navigation & browser refresh work)
  const fetchReportDetails = async (reportId) => {
    try {
      const raw = await getSightingDetails(reportId);
      if (raw) {
        const formatted = normalizeSightingForUi(raw);
        setFoundReports((prev) => {
          const exists = prev.some(
            (r) => r.id === formatted.id || r.reportNumber === formatted.reportNumber
          );
          if (exists) {
            return prev.map((r) =>
              r.id === formatted.id || r.reportNumber === formatted.reportNumber ? formatted : r
            );
          }
          return [formatted, ...prev];
        });
        return formatted;
      }
      return null;
    } catch (err) {
      throw err;
    }
  };

  // Submit Real Sighting Report to Backend API
  const submitRealSighting = async (reportPayload) => {
    const apiResult = await submitSightingReport({
      caseId: reportPayload.caseId,
      description: reportPayload.description || reportPayload.notes || "Observed child unaccompanied.",
      safetyConfirmed: true,
      location: {
        address: reportPayload.location || "",
        landmark: reportPayload.landmark || "",
        latitude: reportPayload.latitude,
        longitude: reportPayload.longitude,
        accuracy: reportPayload.accuracy,
        source: reportPayload.source || "manual",
        capturedAt: reportPayload.capturedAt
      },
      appearance: {
        approxAge: reportPayload.approxAge || "",
        approxGender: reportPayload.approxGender || "",
        clothing: reportPayload.clothing || "",
        distinctiveFeatures: reportPayload.distinctiveFeatures || ""
      },
      safetyState: reportPayload.safetyState || "Safe",
      observedAt: reportPayload.observedAt || new Date().toISOString()
    });

    const s = apiResult.sighting;
    const clientReport = normalizeSightingForUi(s);

    if (clientReport) {
      setFoundReports((prev) => [clientReport, ...prev]);
    }
    return clientReport;
  };

  // Fallback submit found report (redirects to submitRealSighting if caseId present)
  const submitFoundReport = async (reportPayload) => {
    if (reportPayload.caseId) {
      return await submitRealSighting(reportPayload);
    }
    const reportNum = `SR-${Date.now().toString().slice(-6)}`;
    const newReport = {
      ...reportPayload,
      id: reportNum,
      reportNumber: reportNum,
      date: new Date().toLocaleString(),
      status: "Under Review",
      contactStatus: "Pending Police Review",
      locationSharingActive: Boolean(reportPayload.latitude && reportPayload.longitude),
      matchedCaseId: null,
      matchedChildName: null,
      timeline: [
        {
          title: "Found Child Report Recorded",
          time: "Just Now",
          desc: "Report recorded for responder review. Dial 1098 / 112 for urgent response."
        }
      ]
    };

    setFoundReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  // Toggle Location Sharing for a report
  const toggleLocationSharing = (reportId, isSharing) => {
    setFoundReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId || r.reportNumber === reportId) {
          return {
            ...r,
            locationSharingActive: isSharing
          };
        }
        return r;
      })
    );
  };

  // In-memory finder
  const getReportById = (reportId) => {
    return foundReports.find((r) => r.id === reportId || r.reportNumber === reportId);
  };

  // Real database-backed statistics
  const stats = useMemo(() => {
    const totalSubmitted = foundReports.length;
    const underReview = foundReports.filter(
      (r) => r.rawStatus === "submitted" || r.rawStatus === "under_review" || r.status === "Under Review"
    ).length;
    const verified = foundReports.filter(
      (r) => r.rawStatus === "verified" || r.status === "Verified" || r.status === "Match Found"
    ).length;
    const resolved = foundReports.filter(
      (r) => r.rawStatus === "dismissed" || r.status === "Resolved"
    ).length;

    return {
      totalSubmitted,
      underReview,
      verified,
      resolved
    };
  }, [foundReports]);

  // Initial load on mount
  useEffect(() => {
    loadCitizenSightings();
    loadCitizenNotifications();
    loadNearbyFacilities();
  }, [loadCitizenSightings, loadCitizenNotifications, loadNearbyFacilities]);

  return (
    <CitizenContext.Provider
      value={{
        foundReports,
        isLoadingSightings,
        sightingsError,
        notifications,
        isLoadingNotifications,
        facilities,
        isLoadingFacilities,
        stats,
        workflowSession,
        startFoundWorkflow,
        setSafetyStatus,
        setCapturedPhoto,
        runAIMatching,
        submitFoundReport,
        submitRealSighting,
        loadCitizenSightings,
        loadCitizenNotifications,
        loadNearbyFacilities,
        toggleLocationSharing,
        getReportById,
        fetchReportDetails
      }}
    >
      {children}
    </CitizenContext.Provider>
  );
};
