import React, { createContext, useContext, useState, useEffect } from "react";
import {
  searchMissingChildPhoto,
  submitSightingReport,
  getMySightings,
  getUserNotifications
} from "@/services/citizenService";

const CitizenContext = createContext();

export const useCitizen = () => {
  const context = useContext(CitizenContext);
  if (!context) {
    throw new Error("useCitizen must be used within a CitizenProvider");
  }
  return context;
};

export const CitizenProvider = ({ children }) => {

  // Existing Found Reports by this Citizen Helper (populated from MongoDB Sighting records)
  const [foundReports, setFoundReports] = useState([]);
  const [isLoadingSightings, setIsLoadingSightings] = useState(false);
  const [sightingsError, setSightingsError] = useState(null);

  // Citizen Notifications (persisted from API)
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getUserNotifications()
      .then((res) => {
        if (isMounted && Array.isArray(res?.notifications)) {
          setNotifications(res.notifications);
        }
      })
      .catch((err) => {
        console.warn("[CitizenContext] Could not load notifications:", err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
    contactRequestSent: false,
    contactRequestStatus: "Pending", // Pending | Accepted | Declined
    locationSharingActive: false
  });

  // Start Found Workflow
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
        contactRequestSent: false,
        contactRequestStatus: "Pending",
        locationSharingActive: false
      };
    });
  };

  // Set Safety Status
  const setSafetyStatus = (status) => {
    setWorkflowSession((prev) => ({ ...prev, childSafeStatus: status }));
  };

  // Set Photo (accepts file or url or both)
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

  // Request Official Law Enforcement Verification
  const requestGuardianContact = () => {
    setWorkflowSession((prev) => ({
      ...prev,
      contactRequestSent: true,
      contactRequestStatus: "Pending Police Verification"
    }));

    setNotifications((prev) => [
      {
        id: `cn-${Date.now()}`,
        title: "Official Verification Request Dispatched",
        message: "Potential match lead dispatched to assigned law enforcement officers for official verification.",
        time: "Just Now",
        isRead: false,
        type: "info"
      },
      ...prev
    ]);
  };

  // Fetch real sightings and notifications from backend on mount
  useEffect(() => {
    loadCitizenSightings();
    loadCitizenNotifications();
  }, []);

  const loadCitizenSightings = async () => {
    setIsLoadingSightings(true);
    setSightingsError(null);
    try {
      const realSightings = await getMySightings();
      if (Array.isArray(realSightings)) {
        // Map backend Sighting documents to client report card format
        const formatted = realSightings.map((s) => ({
          id: s._id || s.id,
          reportNumber: s.reportNumber || `SR-${(s._id || s.id).slice(-6).toUpperCase()}`,
          date: s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just Now",
          location: s.location?.address || [s.location?.city, s.location?.state].filter(Boolean).join(", ") || "Location on record",
          landmark: s.location?.landmark || "",
          latitude: s.location?.latitude || "",
          longitude: s.location?.longitude || "",
          approxAge: s.appearance?.approxAge || "Not recorded",
          approxGender: s.appearance?.approxGender || "Not specified",
          clothing: s.appearance?.clothing || "Not specified",
          photo: s.childId?.photoUrl || "",
          status: s.status === "submitted" ? "Under Review" : (s.status === "verified" ? "Match Found" : "Resolved"),
          safetyState: s.safetyState || "Safe",
          contactStatus: "Pending Police Verification",
          locationSharingActive: Boolean(s.location?.latitude && s.location?.longitude),
          matchedCaseId: s.caseId?.caseNumber || (s.caseId?._id ? `MC-${s.caseId._id.slice(-6).toUpperCase()}` : null),
          matchedChildName: s.childId?.fullName || null,
          timeline: [
            {
              title: "Sighting Report Filed",
              time: s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just Now",
              desc: `Report registered by citizen helper. Review status: ${s.status}.`
            }
          ]
        }));
        setFoundReports(formatted);
      }
    } catch (err) {
      console.warn("[CitizenContext] Could not load sightings:", err.message);
      setSightingsError(err.message || "Failed to load sightings.");
    } finally {
      setIsLoadingSightings(false);
    }
  };

  const loadCitizenNotifications = async () => {
    try {
      const realNotifs = await getUserNotifications();
      if (Array.isArray(realNotifs) && realNotifs.length > 0) {
        setNotifications(
          realNotifs.map((n) => ({
            id: n._id || n.id,
            title: n.title,
            message: n.message,
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
            isRead: n.isRead,
            type: n.type === "sighting_reported" ? "info" : (n.type === "sighting_reviewed" ? "success" : "warning")
          }))
        );
      }
    } catch (_) {}
  };

  // Submit Real Sighting Report to Node.js Backend API
  const submitRealSighting = async (reportPayload) => {
    const apiResult = await submitSightingReport({
      caseId: reportPayload.caseId,
      description: reportPayload.description || reportPayload.notes || "Observed child unaccompanied.",
      safetyConfirmed: true,
      location: {
        address: reportPayload.location || "",
        landmark: reportPayload.landmark || "",
        latitude: reportPayload.latitude,
        longitude: reportPayload.longitude
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
    const clientReport = {
      id: s.id || s._id,
      reportNumber: s.reportNumber,
      date: new Date().toLocaleString(),
      location: s.location?.address || reportPayload.location || "Location on record",
      landmark: s.location?.landmark || reportPayload.landmark || "",
      latitude: s.location?.latitude || reportPayload.latitude || "",
      longitude: s.location?.longitude || reportPayload.longitude || "",
      approxAge: s.appearance?.approxAge || reportPayload.approxAge || "",
      approxGender: s.appearance?.approxGender || reportPayload.approxGender || "",
      clothing: s.appearance?.clothing || reportPayload.clothing || "",
      photo: reportPayload.photo || "",
      status: "Under Review",
      safetyState: s.safetyState || "Safe",
      contactStatus: "Pending Police Verification",
      locationSharingActive: Boolean(s.location?.latitude && s.location?.longitude),
      matchedCaseId: reportPayload.caseNumber || null,
      matchedChildName: reportPayload.childName || null,
      timeline: [
        {
          title: "Sighting Report Filed",
          time: "Just Now",
          desc: "Report registered persistently in MongoDB. Authorized responders notified."
        }
      ]
    };

    setFoundReports((prev) => [clientReport, ...prev]);
    return clientReport;
  };

  // Submit Found Child Report
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

  // Toggle Location Sharing
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

  const getReportById = (reportId) => {
    return foundReports.find((r) => r.id === reportId || r.reportNumber === reportId);
  };

  return (
    <CitizenContext.Provider
      value={{
        foundReports,
        isLoadingSightings,
        sightingsError,
        notifications,
        workflowSession,
        startFoundWorkflow,
        setSafetyStatus,
        setCapturedPhoto,
        runAIMatching,
        requestGuardianContact,
        submitFoundReport,
        submitRealSighting,
        loadCitizenSightings,
        loadCitizenNotifications,
        toggleLocationSharing,
        getReportById
      }}
    >
      {children}
    </CitizenContext.Provider>
  );
};

