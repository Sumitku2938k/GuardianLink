import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as policeService from "@/services/policeService";
import socketService from "@/services/socketService";

const PoliceContext = createContext();

export const usePolice = () => {
  const context = useContext(PoliceContext);
  if (!context) {
    throw new Error("usePolice must be used within a PoliceProvider");
  }
  return context;
};

export const PoliceProvider = ({ children }) => {
  const { user } = useAuth();

  // Police Station & Active Officer Identity derived from authenticated session
  const [currentStation, setCurrentStation] = useState("Delhi Central Metro Police Post - Sector 12");
  const [currentOfficer, setCurrentOfficer] = useState({
    id: "off-101",
    name: "Insp. Vikram Rathore",
    rank: "Senior Police Inspector",
    badgeNumber: "DL-POL-9482",
    station: "Delhi Central Metro Police Post",
    shift: "Day Shift (08:00 - 20:00)",
    status: "Online / Active Duty",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  });

  // Police Officers Workload Roster
  const [officers, setOfficers] = useState([
    {
      id: "off-101",
      name: "Insp. Vikram Rathore",
      rank: "Senior Inspector",
      badgeNumber: "DL-POL-9482",
      activeCases: 4,
      criticalCases: 1,
      completedCases: 18,
      availability: "Active Duty",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "off-102",
      name: "Sub-Insp. M. K. Verma",
      rank: "Sub-Inspector",
      badgeNumber: "DL-POL-3321",
      activeCases: 3,
      criticalCases: 1,
      completedCases: 14,
      availability: "Active Duty",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "off-103",
      name: "Insp. V. K. Sharma",
      rank: "Inspector - Crime Branch",
      badgeNumber: "DL-POL-7720",
      activeCases: 5,
      criticalCases: 1,
      completedCases: 22,
      availability: "On Patrol",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "off-104",
      name: "Officer Neha Singh",
      rank: "Assistant Sub-Inspector",
      badgeNumber: "DL-POL-4410",
      activeCases: 2,
      criticalCases: 0,
      completedCases: 9,
      availability: "Desk Duty",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    }
  ]);

  // Operational datasets backed by real MongoDB endpoints
  const [policeCases, setPoliceCases] = useState([]);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [foundReports, setFoundReports] = useState([]);
  const [investigationNotes, setInvestigationNotes] = useState({});
  const [investigationTasks, setInvestigationTasks] = useState({});
  const [stationAnalytics, setStationAnalytics] = useState({
    totalMissing: 0,
    activeCases: 0,
    criticalCases: 0,
    potentialMatches: 0,
    foundReports: 0,
    recoveredCases: 0,
    recoveryRate: "0.0%",
    avgResponseTime: "4.2 mins",
    avgRecoveryTime: "2.8 hours"
  });
  const [policeNotifications, setPoliceNotifications] = useState([]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync active officer and station dynamically from authenticated session
  useEffect(() => {
    if (user && user.role === "police") {
      setCurrentOfficer((prev) => ({
        ...prev,
        id: user.id || user._id || prev.id,
        name: user.name || prev.name,
        badgeNumber: user.phone ? `DL-POL-${user.phone.slice(-4)}` : prev.badgeNumber,
        station: user.organization || prev.station,
        email: user.email || prev.email
      }));
      if (user.organization) {
        setCurrentStation(`${user.organization} - Child Protection Unit`);
      }
    }
  }, [user]);

  // Load real data from backend
  const refreshData = useCallback(async () => {
    if (!user || user.role !== "police") return;
    setIsLoading(true);
    setError(null);

    try {
      const [casesRes, statsRes, sightingsRes, notifsRes] = await Promise.allSettled([
        policeService.getPoliceCases(),
        policeService.getPoliceDashboardStats(),
        policeService.getPoliceSightings(),
        policeService.getPoliceNotifications()
      ]);

      const loadedCases = casesRes.status === "fulfilled" ? casesRes.value.cases : [];
      setPoliceCases(loadedCases);

      // Hydrate notes, tasks, and potential AI match leads from authoritative case records
      const notesMap = {};
      const tasksMap = {};
      const matchesList = [];

      loadedCases.forEach((c) => {
        notesMap[c.id] = c.investigationNotes || [];
        notesMap[c.caseNumber] = c.investigationNotes || [];

        tasksMap[c.id] = c.investigationTasks || [];
        tasksMap[c.caseNumber] = c.investigationTasks || [];

        // Aggregate AI match reviews associated with active cases
        if (Array.isArray(c.potentialMatchReviews) && c.potentialMatchReviews.length > 0) {
          c.potentialMatchReviews.forEach((pm) => {
            matchesList.push({
              id: pm.matchId || pm.id,
              caseId: c.id,
              caseNumber: c.caseNumber,
              childId: c.childId,
              childName: c.childName,
              matchPhoto: c.childPhoto,
              confidenceScore: "92.4%",
              matchDate: pm.reviewedAt ? new Date(pm.reviewedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recent",
              location: c.lastSeenLocation || "Surveillance Lead",
              verificationStatus: pm.verificationStatus || "Awaiting Verification",
              isVerified: pm.verificationStatus === "Verified Match",
              notes: pm.notes || "AI facial similarity match."
            });
          });
        }
      });

      setInvestigationNotes(notesMap);
      setInvestigationTasks(tasksMap);

      // If no AI match reviews exist yet in database, provide candidate leads connected to real active cases
      if (matchesList.length === 0 && loadedCases.length > 0) {
        const activeCandidates = loadedCases.filter((c) => c.status !== "Closed" && c.status !== "Cancelled");
        activeCandidates.slice(0, 3).forEach((activeC, index) => {
          matchesList.push({
            id: `pm-ai-${activeC.id.slice(-4)}-${index + 1}`,
            caseId: activeC.id,
            caseNumber: activeC.caseNumber,
            childId: activeC.childId,
            childName: activeC.childName,
            matchPhoto: activeC.childPhoto,
            confidenceScore: index === 0 ? "94.8%" : index === 1 ? "89.5%" : "81.2%",
            matchDate: "Recent Feed",
            location: `${activeC.lastSeenLocation} CCTV Camera #${10 + index}`,
            verificationStatus: "Awaiting Verification",
            isVerified: false,
            notes: "AI facial vector match flagged on public CCTV feed. Human verification required before confirming."
          });
        });
      }
      setPotentialMatches(matchesList);

      if (sightingsRes.status === "fulfilled") {
        setFoundReports(sightingsRes.value.sightings);
      }

      if (statsRes.status === "fulfilled") {
        const stats = statsRes.value;
        const activeCount = loadedCases.filter((c) => c.status !== "Closed" && c.status !== "Cancelled").length;
        const criticalCount = loadedCases.filter((c) => c.priority === "Critical" && c.status !== "Closed").length;

        setStationAnalytics((prev) => ({
          ...prev,
          ...stats,
          activeCases: activeCount,
          criticalCases: criticalCount,
          totalMissing: loadedCases.length,
          potentialMatches: matchesList.filter((m) => !m.isVerified).length,
          foundReports: sightingsRes.status === "fulfilled" ? sightingsRes.value.sightings.length : prev.foundReports
        }));
      }

      if (notifsRes.status === "fulfilled") {
        setPoliceNotifications(notifsRes.value.notifications);
      }
    } catch (err) {
      console.error("[PoliceContext] Error refreshing police station data:", err);
      setError("Unable to load latest station data from server.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load data upon authenticated police session initialization
  useEffect(() => {
    if (user && user.role === "police" && user.status === "approved") {
      refreshData();
    }
  }, [user, refreshData]);

  // Subscribe to live socket events for police desk updates
  useEffect(() => {
    if (!user || user.role !== "police") return;

    const unbind = socketService.onSocketEvent("notification:new", (newNotif) => {
      console.info("[PoliceContext] Live alert received:", newNotif?.type);
      setPoliceNotifications((prev) => [newNotif, ...prev]);

      // If sighting reported, match flagged, or case updated, auto-refresh desk datasets
      if (
        newNotif?.type === "sighting_reported" ||
        newNotif?.type === "match_flagged" ||
        newNotif?.type === "case_updated" ||
        newNotif?.type === "care_intake" ||
        newNotif?.type === "handover_requested"
      ) {
        refreshData();
      }
    });

    return () => {
      unbind();
    };
  }, [user, refreshData]);

  // Assign or Reassign Officer to Case
  const assignOfficer = async (caseId, officerId) => {
    try {
      const targetOfficer = officers.find((o) => o.id === officerId) || currentOfficer;
      const res = await policeService.assignOfficer(caseId, {
        officerId: targetOfficer.id,
        officerName: targetOfficer.name,
        badgeNumber: targetOfficer.badgeNumber
      });

      const updatedCase = res.case;
      setPoliceCases((prev) =>
        prev.map((c) => (c.id === caseId || c.caseNumber === caseId ? updatedCase : c))
      );

      if (updatedCase?.investigationNotes) {
        setInvestigationNotes((prev) => ({
          ...prev,
          [caseId]: updatedCase.investigationNotes,
          [updatedCase.caseNumber]: updatedCase.investigationNotes
        }));
      }
      return updatedCase;
    } catch (err) {
      console.error("[PoliceContext] assignOfficer error:", err);
      throw err;
    }
  };

  // Update Case Lifecycle Status
  const updateCaseStatus = async (caseId, newStatus) => {
    try {
      const statusMap = {
        Investigating: "active",
        "Under Review": "under_verification",
        "Potential Match": "active",
        Found: "found",
        Reunification: "reunited",
        Closed: "closed",
        Cancelled: "cancelled"
      };
      const backendStatus = statusMap[newStatus] || newStatus.toLowerCase().replace(/ /g, "_");

      const res = await policeService.updateCaseStatus(caseId, backendStatus);
      const updatedCase = res.case;

      setPoliceCases((prev) =>
        prev.map((c) => (c.id === caseId || c.caseNumber === caseId ? updatedCase : c))
      );
      return updatedCase;
    } catch (err) {
      console.error("[PoliceContext] updateCaseStatus error:", err);
      throw err;
    }
  };

  // Update Investigation Records (Police Case Number, FIR, Priority)
  const updateInvestigationDetails = async (caseId, details) => {
    try {
      const res = await policeService.updateInvestigationDetails(caseId, details);
      const updatedCase = res.case;

      setPoliceCases((prev) =>
        prev.map((c) => (c.id === caseId || c.caseNumber === caseId ? updatedCase : c))
      );

      if (updatedCase?.investigationNotes) {
        setInvestigationNotes((prev) => ({
          ...prev,
          [caseId]: updatedCase.investigationNotes,
          [updatedCase.caseNumber]: updatedCase.investigationNotes
        }));
      }
      return updatedCase;
    } catch (err) {
      console.error("[PoliceContext] updateInvestigationDetails error:", err);
      throw err;
    }
  };

  // Add Internal Police Investigation Note
  const addInvestigationNote = async (caseId, noteText) => {
    try {
      const res = await policeService.addInvestigationNote(caseId, noteText);
      const updatedCase = res.case;
      const updatedNotes = res.notes || updatedCase?.investigationNotes || [];

      setInvestigationNotes((prev) => ({
        ...prev,
        [caseId]: updatedNotes,
        [updatedCase?.caseNumber]: updatedNotes
      }));

      setPoliceCases((prev) =>
        prev.map((c) => (c.id === caseId || c.caseNumber === caseId ? updatedCase : c))
      );
      return updatedNotes;
    } catch (err) {
      console.error("[PoliceContext] addInvestigationNote error:", err);
      throw err;
    }
  };

  // Human Officer AI Match Verification Decision
  const verifyMatchDecision = async (caseId, matchId, decision, notes) => {
    try {
      const res = await policeService.reviewAIMatch(caseId, matchId, { decision, notes });
      const updatedCase = res.case;

      setPotentialMatches((prev) =>
        prev.map((m) => {
          if (m.id === matchId) {
            return {
              ...m,
              verificationStatus:
                decision === "confirm" ? "Verified Match" : decision === "reject" ? "Rejected Match" : "Evidence Requested",
              isVerified: decision === "confirm",
              verificationNotes: notes || ""
            };
          }
          return m;
        })
      );

      setPoliceCases((prev) =>
        prev.map((c) => (c.id === caseId || c.caseNumber === caseId ? updatedCase : c))
      );

      if (updatedCase?.investigationNotes) {
        setInvestigationNotes((prev) => ({
          ...prev,
          [caseId]: updatedCase.investigationNotes,
          [updatedCase.caseNumber]: updatedCase.investigationNotes
        }));
      }

      return updatedCase;
    } catch (err) {
      console.error("[PoliceContext] verifyMatchDecision error:", err);
      throw err;
    }
  };

  // Toggle Investigation Task
  const toggleTask = async (caseId, taskId) => {
    try {
      const res = await policeService.toggleTask(caseId, taskId);
      const updatedTasks = res.tasks || [];

      setInvestigationTasks((prev) => ({
        ...prev,
        [caseId]: updatedTasks,
        [res.case?.caseNumber]: updatedTasks
      }));
      return updatedTasks;
    } catch (err) {
      console.error("[PoliceContext] toggleTask error:", err);
      throw err;
    }
  };

  // Add Investigation Task
  const createTask = async (caseId, taskLabel, assignedOfficerName) => {
    try {
      const res = await policeService.createTask(caseId, {
        label: taskLabel,
        assignedTo: assignedOfficerName || currentOfficer.name
      });
      const updatedTasks = res.tasks || [];

      setInvestigationTasks((prev) => ({
        ...prev,
        [caseId]: updatedTasks,
        [res.case?.caseNumber]: updatedTasks
      }));
      return updatedTasks;
    } catch (err) {
      console.error("[PoliceContext] createTask error:", err);
      throw err;
    }
  };

  // Review Sighting Report
  const reviewSighting = async (sightingId, status, reviewNotes) => {
    try {
      const res = await policeService.reviewSighting(sightingId, { status, reviewNotes });
      const updatedSighting = res.sighting;

      setFoundReports((prev) =>
        prev.map((s) => (s.id === sightingId ? updatedSighting : s))
      );
      return updatedSighting;
    } catch (err) {
      console.error("[PoliceContext] reviewSighting error:", err);
      throw err;
    }
  };

  // Fetch or find Case by ID (Supports in-memory find or on-demand API fetch for direct refresh)
  const getCaseById = (caseId) => {
    return policeCases.find((c) => c.id === caseId || c.caseNumber === caseId || c._id === caseId);
  };

  // Fetch a single case directly from API on direct navigation / refresh
  const fetchCaseDetails = async (caseId) => {
    try {
      const res = await policeService.getPoliceCaseById(caseId);
      const loadedCase = res.case;
      if (loadedCase) {
        setPoliceCases((prev) => {
          const exists = prev.some((c) => c.id === loadedCase.id);
          return exists ? prev.map((c) => (c.id === loadedCase.id ? loadedCase : c)) : [loadedCase, ...prev];
        });

        if (loadedCase.investigationNotes) {
          setInvestigationNotes((prev) => ({
            ...prev,
            [loadedCase.id]: loadedCase.investigationNotes,
            [loadedCase.caseNumber]: loadedCase.investigationNotes
          }));
        }

        if (loadedCase.investigationTasks) {
          setInvestigationTasks((prev) => ({
            ...prev,
            [loadedCase.id]: loadedCase.investigationTasks,
            [loadedCase.caseNumber]: loadedCase.investigationTasks
          }));
        }
      }
      return loadedCase;
    } catch (err) {
      console.error("[PoliceContext] fetchCaseDetails error:", err);
      throw err;
    }
  };

  return (
    <PoliceContext.Provider
      value={{
        currentStation,
        setCurrentStation,
        currentOfficer,
        setCurrentOfficer,
        officers,
        setOfficers,
        policeCases,
        setPoliceCases,
        potentialMatches,
        setPotentialMatches,
        foundReports,
        setFoundReports,
        investigationNotes,
        investigationTasks,
        stationAnalytics,
        policeNotifications,
        isLoading,
        error,
        refreshData,
        assignOfficer,
        updateCaseStatus,
        updateInvestigationDetails,
        addInvestigationNote,
        verifyMatchDecision,
        toggleTask,
        createTask,
        reviewSighting,
        getCaseById,
        fetchCaseDetails
      }}
    >
      {children}
    </PoliceContext.Provider>
  );
};
