import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

const MissingCasesContext = createContext();

export const useMissingCases = () => {
  const context = useContext(MissingCasesContext);
  if (!context) {
    throw new Error("useMissingCases must be used within a MissingCasesProvider");
  }
  return context;
};

// Stage index mapping for CaseStatusTracker
const STAGE_MAP = {
  reported: 1,
  under_verification: 2,
  active: 4,
  found: 6,
  reunited: 8,
  closed: 9,
  cancelled: 1
};

export const normalizeCaseForUi = (c) => {
  if (!c) return null;
  const id = c._id ? c._id.toString() : (c.id || "");
  const caseNumber = c.policeCaseNumber || c.caseNumber || `MC-${id.slice(-6).toUpperCase()}`;

  // Child details (c.childId might be populated object or id string)
  const child = (typeof c.childId === "object" && c.childId !== null) ? c.childId : {};
  const childId = child._id ? child._id.toString() : (typeof c.childId === "string" ? c.childId : "");
  const childName = child.fullName || child.name || c.childName || "Unknown Child";

  // Calculate age
  let childAge = c.childAge;
  if (childAge === undefined || childAge === null) {
    if (child.dateOfBirth) {
      const birth = new Date(child.dateOfBirth);
      const today = new Date();
      childAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) childAge--;
      childAge = Math.max(0, childAge);
    } else {
      childAge = child.age || 0;
    }
  }

  const defaultPhoto =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
  const childPhoto =
    child.photoUrl || (Array.isArray(child.photos) && child.photos[0]) || c.childPhoto || defaultPhoto;
  const childGender = child.gender
    ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1).toLowerCase()
    : c.childGender || "Unknown";

  const rawStatus = (c.status || "reported").toLowerCase();
  const stageIndex = c.stageIndex || STAGE_MAP[rawStatus] || 1;

  // Format status for UI badges & display
  const statusDisplayMap = {
    reported: "Under Review",
    under_verification: "Under Review",
    active: "Active",
    found: "Found",
    reunited: "Reunification",
    closed: "Closed",
    cancelled: "Cancelled"
  };
  const uiStatus = statusDisplayMap[rawStatus] || c.status || "Active";

  const rawPriority = (c.priority || "high").toLowerCase();
  const priority = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1);

  // Missing Date & Time parsing
  let lastSeenDate = c.lastSeenDate || "";
  let lastSeenTime = c.lastSeenTime || "";
  if (c.missingDate) {
    try {
      const d = new Date(c.missingDate);
      if (!isNaN(d.getTime())) {
        lastSeenDate = d.toISOString().split("T")[0];
        lastSeenTime = d.toTimeString().split(" ")[0].substring(0, 5);
      }
    } catch {
      // ignore
    }
  }

  // Location formatting
  let locStr = "";
  let landmark = "";
  let lat = "";
  let lng = "";
  if (typeof c.lastSeenLocation === "object" && c.lastSeenLocation !== null) {
    locStr =
      c.lastSeenLocation.address ||
      [c.lastSeenLocation.city, c.lastSeenLocation.state].filter(Boolean).join(", ");
    landmark = c.lastSeenLocation.pinCode ? `PIN: ${c.lastSeenLocation.pinCode}` : "";
    lat = c.lastSeenLocation.latitude !== undefined ? String(c.lastSeenLocation.latitude) : "";
    lng = c.lastSeenLocation.longitude !== undefined ? String(c.lastSeenLocation.longitude) : "";
  } else if (typeof c.lastSeenLocation === "string") {
    locStr = c.lastSeenLocation;
  }
  if (!locStr) locStr = "Location recorded on file";

  const firNumber = c.firNumber || "";
  const firAvailable = Boolean(firNumber);

  return {
    ...c,
    id,
    _id: id,
    caseNumber,
    policeCaseNumber: c.policeCaseNumber || caseNumber,
    childId,
    childName,
    childAge,
    childGender,
    childPhoto,
    status: uiStatus,
    rawStatus,
    priority,
    stageIndex,
    lastSeenDate: lastSeenDate || new Date().toISOString().split("T")[0],
    lastSeenTime: lastSeenTime || "12:00",
    lastSeenLocation: locStr,
    locationLandmark: landmark || c.locationLandmark || "",
    latitude: lat || c.latitude || "28.6139",
    longitude: lng || c.longitude || "77.2090",
    circumstances: c.lastSeenDescription || c.circumstances || "Incident details on file",
    lastSeenDescription: c.lastSeenDescription || c.circumstances || "",
    firNumber,
    firAvailable,
    policeStatus: rawStatus === "active" ? "Investigating" : (rawStatus === "closed" ? "Closed" : "Under Review"),
    policeStationName: c.policeStationName || c.policeStation || "Central Police Control Room",
    policeOfficerName: c.policeOfficerName || "Assigned Duty Officer",
    policeContact: c.policeContact || "+91 98110 00100",
    createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : "Recently",
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "Recently"
  };
};

export const MissingCasesProvider = ({ children }) => {
  const { user } = useAuth();
  const [missingCases, setMissingCases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Potential Matches Data (Secondary UI compatibility)
  const [potentialMatches, setPotentialMatches] = useState([]);

  // Citizen Sighting Reports Data
  const [citizenReports, setCitizenReports] = useState([]);

  // Case Timelines Data
  const [caseTimelines, setCaseTimelines] = useState({});

  // Fetch Cases from Backend
  const fetchCases = useCallback(async () => {
    if (!user) return [];
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/cases");
      if (response.data && response.data.success) {
        const rawCases = response.data.cases || [];
        const normalized = rawCases.map(normalizeCaseForUi);
        setMissingCases(normalized);
        return normalized;
      }
      return [];
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to fetch missing cases";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load when user logs in
  useEffect(() => {
    if (user) {
      fetchCases();
    } else {
      setMissingCases([]);
    }
  }, [user, fetchCases]);

  // Create Case (POST /api/cases)
  const createCase = async (casePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      let missingDate = new Date();
      if (casePayload.lastSeenDate) {
        const timePart = casePayload.lastSeenTime || "12:00";
        missingDate = new Date(`${casePayload.lastSeenDate}T${timePart}:00`);
        if (isNaN(missingDate.getTime())) {
          missingDate = new Date();
        }
      }

      const body = {
        childId: casePayload.childId,
        missingDate: missingDate.toISOString(),
        lastSeenLocation: {
          address: casePayload.lastSeenLocation || "Unspecified location",
          latitude: casePayload.latitude ? Number(casePayload.latitude) : undefined,
          longitude: casePayload.longitude ? Number(casePayload.longitude) : undefined
        },
        lastSeenDescription: [
          casePayload.circumstances,
          casePayload.clothingTop ? `Clothing: ${casePayload.clothingTop}` : null,
          casePayload.clothingBottom ? `Bottom: ${casePayload.clothingBottom}` : null
        ].filter(Boolean).join(". "),
        priority: (casePayload.priority || "high").toLowerCase(),
        firNumber: casePayload.firNumber || ""
      };

      const response = await api.post("/api/cases", body);

      if (response.data && response.data.success) {
        const createdRaw = response.data.case;
        const normalized = normalizeCaseForUi(createdRaw);

        // Update local state
        setMissingCases((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);

        // Initialize timeline
        const initialTimeline = [
          {
            id: `ctl-${Date.now()}`,
            title: "Missing Child Report Submitted",
            desc: "Emergency report registered with platform authorities.",
            time: "Just Now",
            actor: "Parent Guardian",
            stageIndex: 1
          }
        ];
        setCaseTimelines((prev) => ({
          ...prev,
          [normalized.id]: initialTimeline,
          [normalized.caseNumber]: initialTimeline
        }));

        return normalized;
      }
      throw new Error(response.data?.message || "Failed to create missing case report");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to file missing case report";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update Case Status (PATCH /api/cases/:caseId/status)
  const updateCaseStatus = async (caseId, newStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.patch(`/api/cases/${caseId}/status`, { status: newStatus });
      if (response.data && response.data.success) {
        const updatedRaw = response.data.case;
        const normalized = normalizeCaseForUi(updatedRaw);

        setMissingCases((prev) =>
          prev.map((c) => (c.id === normalized.id || c.caseNumber === normalized.caseNumber ? normalized : c))
        );
        return normalized;
      }
      throw new Error(response.data?.message || "Failed to update case status");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update status";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get Case By ID (from cache or API)
  const getCaseById = async (caseId) => {
    if (!caseId) return null;
    const found = missingCases.find(
      (c) => c.id === caseId || c._id === caseId || c.caseNumber === caseId || c.policeCaseNumber === caseId
    );
    if (found) return found;

    try {
      const response = await api.get(`/api/cases/${caseId}`);
      if (response.data && response.data.success) {
        const normalized = normalizeCaseForUi(response.data.case);
        setMissingCases((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);
        return normalized;
      }
    } catch (err) {
      console.error("Failed to fetch case by ID:", err);
    }
    return null;
  };

  // Synchronous lookup from current cached state
  const findCaseInState = (caseId) => {
    if (!caseId) return null;
    return missingCases.find(
      (c) => c.id === caseId || c._id === caseId || c.caseNumber === caseId || c.policeCaseNumber === caseId
    );
  };

  // Check if Child has an Active Case
  const getActiveCaseForChild = (childId) => {
    if (!childId) return null;
    const targetId = String(childId);
    return missingCases.find((c) => {
      const cid = String(c.childId);
      const isActiveStatus = ["reported", "under_verification", "active", "found"].includes(
        (c.rawStatus || c.status || "").toLowerCase()
      );
      return cid === targetId && isActiveStatus;
    });
  };

  // UI state modifiers for backwards-compatibility
  const updateCase = (caseId, updates) => {
    setMissingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId || c.caseNumber === caseId) {
          return { ...c, ...updates, updatedAt: "Just Now" };
        }
        return c;
      })
    );
  };

  const verifyMatch = (caseId, matchId) => {
    setPotentialMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return { ...m, isVerified: true, verificationStatus: "Verified by Guardian" };
        }
        return m;
      })
    );
  };

  const closeCase = async (caseId, recoveryDetails) => {
    try {
      // Try cancelling if allowed or update state
      await updateCaseStatus(caseId, "cancelled").catch(() => {
        // If parent status update restricted, update local state
      });
    } catch {
      // handled
    }
    setMissingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId || c.caseNumber === caseId) {
          return {
            ...c,
            status: "Closed",
            rawStatus: "closed",
            stageIndex: 9,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );
  };

  return (
    <MissingCasesContext.Provider
      value={{
        missingCases,
        isLoading,
        error,
        potentialMatches,
        citizenReports,
        caseTimelines,
        fetchCases,
        createCase,
        updateCase,
        updateCaseStatus,
        verifyMatch,
        closeCase,
        getCaseById,
        findCaseInState,
        getActiveCaseForChild
      }}
    >
      {children}
    </MissingCasesContext.Provider>
  );
};
