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

  // Existing Found Reports by this Citizen Helper
  const [foundReports, setFoundReports] = useState([
    {
      id: "CR-2026-9041",
      reportNumber: "CR-2026-9041",
      date: "2026-08-11 16:30",
      location: "Sector 14 Public Library Kiosk",
      landmark: "Near Central Metro Gate 3",
      latitude: "28.6139",
      longitude: "77.2090",
      approxAge: "8 years",
      approxGender: "Male",
      clothing: "Blue T-shirt, navy trousers, red backpack",
      photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      status: "Match Found", // Processing, Match Found, Under Review, Resolved
      safetyState: "Safe in Library Reading Room",
      contactStatus: "Accepted", // Pending, Accepted, Declined
      locationSharingActive: true,
      matchedCaseId: "MC-2026-8821",
      matchedChildName: "Kabir Mehta",
      timeline: [
        { title: "Found Child Report Created", time: "2026-08-11 16:30", desc: "Citizen initiated identification at Library Kiosk." },
        { title: "AI Potential Match Found", time: "2026-08-11 16:32", desc: "AI engine flagged 94.8% vector similarity with Active Case #MC-2026-8821." },
        { title: "Guardian Contact Requested", time: "2026-08-11 16:35", desc: "Secure proxy request dispatched to verified parent." },
        { title: "Guardian Accepted Contact", time: "2026-08-11 16:40", desc: "Guardian John Mehta confirmed child details and initiated handover dispatch." }
      ]
    },
    {
      id: "CR-2026-3180",
      reportNumber: "CR-2026-3180",
      date: "2026-08-10 11:15",
      location: "Railway Station Gate #2",
      landmark: "Opposite Ticket Counter B",
      latitude: "28.6200",
      longitude: "77.2100",
      approxAge: "6 years",
      approxGender: "Female",
      clothing: "Yellow T-shirt, blue denim shorts",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      status: "Under Review",
      safetyState: "Safe with Railway Protection Force Post",
      contactStatus: "Pending",
      locationSharingActive: false,
      matchedCaseId: null,
      matchedChildName: null,
      timeline: [
        { title: "Report Submitted", time: "2026-08-10 11:15", desc: "Report filed by citizen helper." },
        { title: "No Immediate Match Flagged", time: "2026-08-10 11:16", desc: "Database query complete. Queued for police desk review." }
      ]
    },
    {
      id: "CR-2026-1120",
      reportNumber: "CR-2026-1120",
      date: "2026-07-28 14:00",
      location: "City Central Park Gate #1",
      landmark: "Ice Cream Parlor",
      latitude: "28.5355",
      longitude: "77.3910",
      approxAge: "5 years",
      approxGender: "Female",
      clothing: "Pink floral dress",
      photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80",
      status: "Resolved",
      safetyState: "Handed over to family",
      contactStatus: "Accepted",
      locationSharingActive: false,
      matchedCaseId: "MC-2026-1092",
      matchedChildName: "Ananya Sharma",
      timeline: [
        { title: "Report Submitted", time: "2026-07-28 14:00", desc: "Sighting report filed." },
        { title: "Child Reunited", time: "2026-07-28 15:30", desc: "Parent safely reunited child." }
      ]
    }
  ]);

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
    locationName: "Sector 14 Public Kiosk, Delhi",
    landmark: "Near Metro Exit 3",
    latitude: "28.6139",
    longitude: "77.2090",
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
        locationName: "Sector 14 Public Kiosk, Delhi",
        landmark: "Near Metro Exit 3",
        latitude: "28.6139",
        longitude: "77.2090",
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

  // Request Guardian Contact
  const requestGuardianContact = () => {
    setWorkflowSession((prev) => ({
      ...prev,
      contactRequestSent: true,
      contactRequestStatus: "Pending"
    }));

    // Simulate Guardian Acceptance after 3 seconds for interactive demo
    setTimeout(() => {
      setWorkflowSession((prev) => ({
        ...prev,
        contactRequestStatus: "Accepted",
        locationSharingActive: true
      }));

      // Add Notification
      setNotifications((prev) => [
        {
          id: `cn-${Date.now()}`,
          title: "Guardian Accepted Contact Request",
          message: "Guardian of Kabir Mehta confirmed the match and accepted proxy contact.",
          time: "Just Now",
          isRead: false,
          type: "success"
        },
        ...prev
      ]);
    }, 3000);
  };

  // Fetch real sightings and notifications from backend on mount
  useEffect(() => {
    loadCitizenSightings();
    loadCitizenNotifications();
  }, []);

  const loadCitizenSightings = async () => {
    try {
      const realSightings = await getMySightings();
      if (Array.isArray(realSightings) && realSightings.length > 0) {
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
          contactStatus: "Pending",
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
    } catch (_) {}
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
      contactStatus: "Pending",
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

  // Submit Found Child Report (Fallback Flow)
  const submitFoundReport = (reportPayload) => {
    const reportNum = `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport = {
      ...reportPayload,
      id: reportNum,
      reportNumber: reportNum,
      date: new Date().toLocaleString(),
      status: "Under Review",
      contactStatus: "Pending",
      locationSharingActive: false,
      matchedCaseId: null,
      matchedChildName: null,
      timeline: [
        {
          title: "Found Child Report Created",
          time: "Just Now",
          desc: "Report registered by citizen helper for police and NGO review."
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

