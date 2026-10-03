import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

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
  // Police Station & Active Officer Identity
  const [currentStation, setCurrentStation] = useState("Delhi Central Metro Police Post - Sector 12");
  const [currentOfficer, setCurrentOfficer] = useState({
    id: "off-101",
    name: "Insp. R. S. Rathore",
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
      name: "Insp. R. S. Rathore",
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

  // Police Cases Dataset
  const [policeCases, setPoliceCases] = useState([
    {
      id: "MC-2026-8821",
      caseNumber: "MC-2026-8821",
      childId: "3",
      childName: "Kabir Mehta",
      childAge: 10,
      childGender: "Male",
      childPhoto: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      status: "Investigating", // Draft, New, Under Review, Assigned, Investigating, Potential Match, Found, Reunification, Recovered, Closed
      priority: "High", // Low, Medium, High, Critical
      stageIndex: 4,
      lastSeenLocation: "Central Metro Station Gate #3, Sector 12",
      locationLandmark: "Opposite Domino's Pizza",
      lastSeenDate: "2026-08-08",
      lastSeenTime: "14:30",
      createdAt: "2026-08-08 15:00",
      updatedAt: "10 mins ago",
      assignedOfficerId: "off-101",
      assignedOfficerName: "Insp. R. S. Rathore",
      assignedOfficerBadge: "DL-POL-9482",
      stationName: "Delhi Central Metro Police Post",
      firNumber: "FIR-492/2026",
      firAvailable: true,

      // Authorized Child Info
      height: "140 cm",
      hair: "Short black hair",
      clothingTop: "Blue school shirt with navy collar",
      clothingBottom: "Dark grey trousers",
      distinctiveMarks: "Visible scar on right forearm",
      circumstances: "Did not arrive at tuition center after 2:15 PM dismissal.",

      // Medical Info (Authorized)
      bloodGroup: "B+",
      medicalConditions: "Asthma (Carries inhaler)",
      allergies: "Peanuts",
      medication: "Salbutamol Inhaler",

      // Verified Guardian Info
      guardianName: "John Mehta",
      guardianRelation: "Father",
      guardianPhone: "+91 98110 00100",
      guardianEmail: "john.mehta@example.com",
      guardianVerified: true
    },
    {
      id: "MC-2026-4431",
      caseNumber: "MC-2026-4431",
      childId: "4",
      childName: "Rhea Kapoor",
      childAge: 7,
      childGender: "Female",
      childPhoto: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80",
      status: "Under Review",
      priority: "Critical",
      stageIndex: 2,
      lastSeenLocation: "City Mall Food Court, 2nd Floor",
      locationLandmark: "Near McDonald's play area",
      lastSeenDate: "2026-08-09",
      lastSeenTime: "11:15",
      createdAt: "2026-08-09 11:30",
      updatedAt: "25 mins ago",
      assignedOfficerId: "off-103",
      assignedOfficerName: "Insp. V. K. Sharma",
      assignedOfficerBadge: "DL-POL-7720",
      stationName: "Sector 18 Central Police Post",
      firNumber: "Pending FIR",
      firAvailable: false,

      height: "120 cm",
      hair: "Long brown hair in pigtails",
      clothingTop: "Pink frock with floral patterns",
      clothingBottom: "White leggings",
      distinctiveMarks: "Small birthmark on left calf",
      circumstances: "Disappeared from play area during peak Sunday mall crowd.",

      bloodGroup: "O+",
      medicalConditions: "None",
      allergies: "Penicillin",
      medication: "None",

      guardianName: "Sunita Kapoor",
      guardianRelation: "Mother",
      guardianPhone: "+91 98110 00112",
      guardianEmail: "sunita.k@example.com",
      guardianVerified: true
    },
    {
      id: "MC-2026-1092",
      caseNumber: "MC-2026-1092",
      childId: "2",
      childName: "Ananya Sharma",
      childAge: 5,
      childGender: "Female",
      childPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      status: "Closed",
      priority: "Medium",
      stageIndex: 9,
      lastSeenLocation: "Public Park Gate #1, Sector 9",
      locationLandmark: "Near ice cream kiosk",
      lastSeenDate: "2026-07-10",
      lastSeenTime: "16:00",
      createdAt: "2026-07-10 16:15",
      updatedAt: "2026-07-10 18:00",
      assignedOfficerId: "off-102",
      assignedOfficerName: "Sub-Insp. M. K. Verma",
      assignedOfficerBadge: "DL-POL-3321",
      stationName: "Sector 9 Police Station",
      firNumber: "FIR-210/2026",
      firAvailable: true,

      height: "105 cm",
      hair: "Short black hair",
      clothingTop: "Yellow T-shirt",
      clothingBottom: "Blue denim shorts",
      distinctiveMarks: "Light birthmark on neck",
      circumstances: "Wandered off near park entrance.",

      bloodGroup: "A+",
      medicalConditions: "None",
      allergies: "None",
      medication: "None",

      guardianName: "Vikram Sharma",
      guardianRelation: "Father",
      guardianPhone: "+91 98110 00900",
      guardianEmail: "vikram.sharma@example.com",
      guardianVerified: true
    }
  ]);

  // Internal Police Investigation Notes
  const [investigationNotes, setInvestigationNotes] = useState({
    "MC-2026-8821": [
      {
        id: "in-1",
        officerName: "Insp. R. S. Rathore",
        badge: "DL-POL-9482",
        time: "2026-08-08 15:45",
        text: "Report received. Dispatched Patrol Car 4 to Sector 12 Metro Station. Requested CCTV footage logs from Metro Security Control."
      },
      {
        id: "in-2",
        officerName: "Insp. R. S. Rathore",
        badge: "DL-POL-9482",
        time: "2026-08-08 16:15",
        text: "AI Neural Engine flagged candidate match at Metro Exit 4B. Dispatching Sub-Insp. Verma to verify candidate in person."
      }
    ],
    "MC-2026-4431": [
      {
        id: "in-10",
        officerName: "Insp. V. K. Sharma",
        badge: "DL-POL-7720",
        time: "2026-08-09 11:40",
        text: "City Mall security locked down exit gates 1, 2 & 3. Reviewing Food Court CCTV Camera #8 feed."
      }
    ]
  });

  // Actionable Police Tasks Checklist per Case
  const [investigationTasks, setInvestigationTasks] = useState({
    "MC-2026-8821": [
      { id: "task-1", label: "Verify guardian legal identity", completed: true, assignedTo: "Insp. R. S. Rathore" },
      { id: "task-2", label: "Request Metro Station CCTV feed", completed: true, assignedTo: "Insp. R. S. Rathore" },
      { id: "task-3", label: "Verify AI candidate match at Exit 4B", completed: false, assignedTo: "Sub-Insp. M. K. Verma" },
      { id: "task-4", label: "Check nearby citizen sighting reports", completed: true, assignedTo: "Insp. R. S. Rathore" },
      { id: "task-5", label: "Coordinate handover with family", completed: false, assignedTo: "Insp. R. S. Rathore" }
    ],
    "MC-2026-4431": [
      { id: "task-10", label: "Review City Mall Exit CCTV logs", completed: true, assignedTo: "Insp. V. K. Sharma" },
      { id: "task-11", label: "Interview mall food court staff", completed: false, assignedTo: "Insp. V. K. Sharma" },
      { id: "task-12", label: "Issue emergency citizen alert radius 2km", completed: false, assignedTo: "Officer Neha Singh" }
    ]
  });

  // Dynamically sync active officer and station from authenticated police session
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

  // AI Vector Potential Candidate Matches Queue
  const [potentialMatches, setPotentialMatches] = useState([
    {
      id: "pm-101",
      caseId: "MC-2026-8821",
      caseNumber: "MC-2026-8821",
      childId: "3",
      childName: "Kabir Mehta",
      matchPhoto: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      confidenceScore: "94.8%",
      matchDate: "2026-08-08 16:10",
      location: "Metro Station Exit 4B CCTV Camera #12",
      verificationStatus: "Awaiting Verification",
      isVerified: false,
      notes: "AI facial vector match triggered on public CCTV feed. High confidence match on eye-to-nose geometry."
    },
    {
      id: "pm-102",
      caseId: "MC-2026-8821",
      caseNumber: "MC-2026-8821",
      childId: "3",
      childName: "Kabir Mehta",
      matchPhoto: "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80",
      confidenceScore: "81.2%",
      matchDate: "2026-08-08 15:40",
      location: "Bus Terminal Platform 2",
      verificationStatus: "Under Review by Police Desk",
      isVerified: false,
      notes: "Possible candidate match flagged by citizen upload."
    },
    {
      id: "pm-103",
      caseId: "MC-2026-4431",
      caseNumber: "MC-2026-4431",
      childId: "4",
      childName: "Rhea Kapoor",
      matchPhoto: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80",
      confidenceScore: "89.5%",
      matchDate: "2026-08-09 11:45",
      location: "City Mall Exit Gate 2 CCTV",
      verificationStatus: "Awaiting Verification",
      isVerified: false,
      notes: "AI facial similarity match on mall surveillance feed."
    }
  ]);

  // Citizen Found Child Reports Queue for Police Verification
  const [foundReports, setFoundReports] = useState([
    {
      id: "CR-2026-9041",
      reportNumber: "CR-2026-9041",
      date: "2026-08-11 16:30",
      location: "Sector 14 Public Library Kiosk",
      landmark: "Near Central Metro Gate 3",
      approxAge: "8 years",
      approxGender: "Male",
      clothing: "Blue T-shirt, navy trousers, red backpack",
      photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      status: "Match Found",
      safetyState: "Safe in Library Reading Room",
      matchedCaseId: "MC-2026-8821",
      matchedChildName: "Kabir Mehta"
    },
    {
      id: "CR-2026-3180",
      reportNumber: "CR-2026-3180",
      date: "2026-08-10 11:15",
      location: "Railway Station Gate #2",
      landmark: "Opposite Ticket Counter B",
      approxAge: "6 years",
      approxGender: "Female",
      clothing: "Yellow T-shirt, blue denim shorts",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      status: "Under Review",
      safetyState: "Safe with Railway Protection Force Post",
      matchedCaseId: null,
      matchedChildName: null
    }
  ]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      setError("Unable to load latest station data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Station Analytics Data
  const [stationAnalytics, setStationAnalytics] = useState({
    totalMissing: 48,
    activeCases: 12,
    criticalCases: 3,
    potentialMatches: 7,
    foundReports: 18,
    recoveredCases: 36,
    recoveryRate: "92.4%",
    avgResponseTime: "4.2 mins",
    avgRecoveryTime: "2.8 hours"
  });

  // Police Notifications Center
  const [policeNotifications, setPoliceNotifications] = useState([
    {
      id: "pn-1",
      title: "Critical Priority Case Filed",
      message: "New critical case #MC-2026-4431 (Rhea Kapoor) reported at City Mall.",
      time: "25 mins ago",
      priority: "Critical",
      isRead: false
    },
    {
      id: "pn-2",
      title: "High AI Match Candidate Sighted",
      message: "AI Camera #12 flagged 94.8% match for Case #MC-2026-8821.",
      time: "40 mins ago",
      priority: "High",
      isRead: false
    },
    {
      id: "pn-3",
      title: "Citizen Sighting Submitted",
      message: "Citizen Reporter #482 submitted sighting report near Sector 14 Metro.",
      time: "1 hour ago",
      priority: "Medium",
      isRead: true
    }
  ]);

  // Functions

  // Assign or Reassign Officer to Case
  const assignOfficer = (caseId, officerId) => {
    const targetOfficer = officers.find((o) => o.id === officerId);
    if (!targetOfficer) return;

    setPoliceCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId || c.caseNumber === caseId) {
          return {
            ...c,
            assignedOfficerId: targetOfficer.id,
            assignedOfficerName: targetOfficer.name,
            assignedOfficerBadge: targetOfficer.badgeNumber,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );

    // Add note entry
    const noteEntry = {
      id: `in-assign-${Date.now()}`,
      officerName: currentOfficer.name,
      badge: currentOfficer.badgeNumber,
      time: "Just Now",
      text: `Reassigned case to ${targetOfficer.name} (${targetOfficer.badgeNumber}).`
    };

    setInvestigationNotes((prev) => ({
      ...prev,
      [caseId]: [noteEntry, ...(prev[caseId] || [])]
    }));
  };

  // Update Case Status
  const updateCaseStatus = (caseId, newStatus) => {
    const stageMap = {
      Draft: 1,
      New: 1,
      "Under Review": 2,
      Assigned: 3,
      Investigating: 4,
      "Potential Match": 5,
      Found: 6,
      Reunification: 8,
      Recovered: 9,
      Closed: 9
    };

    setPoliceCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId || c.caseNumber === caseId) {
          return {
            ...c,
            status: newStatus,
            stageIndex: stageMap[newStatus] || c.stageIndex,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );

    const noteEntry = {
      id: `in-status-${Date.now()}`,
      officerName: currentOfficer.name,
      badge: currentOfficer.badgeNumber,
      time: "Just Now",
      text: `Updated official case status to "${newStatus}".`
    };

    setInvestigationNotes((prev) => ({
      ...prev,
      [caseId]: [noteEntry, ...(prev[caseId] || [])]
    }));
  };

  // Add Internal Investigation Note
  const addInvestigationNote = (caseId, noteText) => {
    const noteEntry = {
      id: `in-${Date.now()}`,
      officerName: currentOfficer.name,
      badge: currentOfficer.badgeNumber,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", Today",
      text: noteText
    };

    setInvestigationNotes((prev) => ({
      ...prev,
      [caseId]: [noteEntry, ...(prev[caseId] || [])]
    }));
  };

  // Human Officer AI Match Verification Decision
  const verifyMatchDecision = (caseId, matchId, decision, notes) => {
    setPotentialMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            verificationStatus: decision === "confirm" ? "Verified Match" : decision === "reject" ? "Rejected Match" : "Evidence Requested",
            isVerified: decision === "confirm",
            verificationNotes: notes || ""
          };
        }
        return m;
      })
    );

    // Decision: 'confirm' | 'reject' | 'request_evidence'
    if (decision === "confirm") {
      updateCaseStatus(caseId, "Found");
      addInvestigationNote(caseId, `Officer confirmed AI Match #${matchId}. Verification notes: "${notes || "Evidence sufficient"}"`);
    } else if (decision === "reject") {
      addInvestigationNote(caseId, `Officer rejected AI Match #${matchId}. Reason: "${notes || "Visual mismatch"}"`);
    } else {
      addInvestigationNote(caseId, `Officer requested additional evidence for AI Match #${matchId}. Notes: "${notes || "Requires higher res image"}"`);
    }
  };

  // Toggle Investigation Task
  const toggleTask = (caseId, taskId) => {
    setInvestigationTasks((prev) => ({
      ...prev,
      [caseId]: (prev[caseId] || []).map((t) => {
        if (t.id === taskId) {
          return { ...t, completed: !t.completed };
        }
        return t;
      })
    }));
  };

  // Add Investigation Task
  const createTask = (caseId, taskLabel, assignedOfficerName) => {
    const newTask = {
      id: `task-${Date.now()}`,
      label: taskLabel,
      completed: false,
      assignedTo: assignedOfficerName || currentOfficer.name
    };

    setInvestigationTasks((prev) => ({
      ...prev,
      [caseId]: [...(prev[caseId] || []), newTask]
    }));
  };

  const getCaseById = (caseId) => {
    return policeCases.find((c) => c.id === caseId || c.caseNumber === caseId);
  };

  return (
    <PoliceContext.Provider
      value={{
        currentStation,
        setCurrentStation,
        currentOfficer,
        setCurrentOfficer,
        officers,
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
        addInvestigationNote,
        verifyMatchDecision,
        toggleTask,
        createTask,
        getCaseById
      }}
    >
      {children}
    </PoliceContext.Provider>
  );
};
