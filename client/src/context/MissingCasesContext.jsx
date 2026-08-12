import React, { createContext, useContext, useState } from "react";

const MissingCasesContext = createContext();

export const useMissingCases = () => {
  const context = useContext(MissingCasesContext);
  if (!context) {
    throw new Error("useMissingCases must be used within a MissingCasesProvider");
  }
  return context;
};

export const MissingCasesProvider = ({ children }) => {
  const [missingCases, setMissingCases] = useState([
    {
      id: "MC-2026-8821",
      caseNumber: "MC-2026-8821",
      childId: "3",
      childName: "Kabir Mehta",
      childAge: 10,
      childGender: "Male",
      childPhoto: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      status: "Investigating", // Draft, Active, Under Review, Investigating, Potential Match, Found, Reunification, Recovered, Closed
      priority: "High", // Low, Medium, High, Critical
      stageIndex: 4, // 1 to 9 matching status tracker stages
      
      // Last Seen
      lastSeenDate: "2026-08-08",
      lastSeenTime: "14:30",
      lastSeenLocation: "Central Metro Station Gate #3, Sector 12",
      locationLandmark: "Opposite Domino's Pizza, Metro Exit 3",
      latitude: "28.6139",
      longitude: "77.2090",
      lastKnownActivity: "Walking towards tuition center after afternoon class",
      companion: "Alone",
      
      // Appearance & Clothing
      clothingTop: "Blue school shirt with navy collar",
      clothingBottom: "Dark grey trousers",
      clothingShoes: "Black leather shoes with white socks",
      accessories: "Red Adidas backpack",
      height: "140 cm",
      hair: "Short black hair, side parting",
      skinTone: "Fair",
      distinctiveMarks: "Visible scar on right forearm from bicycle injury",
      circumstances: "Did not arrive at tuition center after 2:15 PM school dismissal. Phone was unreachable.",
      vehicleInvolved: false,
      vehicleDetails: "",
      
      // FIR Details
      firAvailable: true,
      firNumber: "FIR-492/2026",
      policeStation: "Delhi Central Metro Police Station",
      firDate: "2026-08-08",
      firDocument: "FIR_MC-2026-8821.pdf",
      
      // Authority & Police Assignment
      policeStatus: "Investigating",
      policeAssigned: true,
      policeStationName: "Delhi Central Metro Police Station - Crime Branch",
      policeOfficerName: "Inspector R. S. Rathore",
      policeBadgeNumber: "DL-POL-9482",
      policeContact: "+91 98110 00100",
      policeAssignedTime: "2026-08-08 15:45",
      policeLastUpdate: "AI camera feed matched candidate at Metro Station 4B. Squad dispatched.",
      
      // Live Location & Verification Status
      liveLocationActive: true,
      lastSharedLocation: "Metro Station Exit 4B, Sector 14",
      lastLocationTimestamp: "8 minutes ago",

      createdAt: "2026-08-08 15:00",
      updatedAt: "10 minutes ago"
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
      
      // Last Seen
      lastSeenDate: "2026-08-09",
      lastSeenTime: "11:15",
      lastSeenLocation: "City Mall Food Court, 2nd Floor",
      locationLandmark: "Near McDonald's play area",
      latitude: "28.5355",
      longitude: "77.3910",
      lastKnownActivity: "Playing near soft play area while parent ordered food",
      companion: "Parent was 10 feet away",
      
      // Appearance & Clothing
      clothingTop: "Pink frock with floral patterns",
      clothingBottom: "White leggings",
      clothingShoes: "Pink sneakers with lights",
      accessories: "Yellow hairband with bow",
      height: "120 cm",
      hair: "Long brown hair in pigtails",
      skinTone: "Wheatish",
      distinctiveMarks: "Small birthmark on left calf",
      circumstances: "Disappeared from play area during peak Sunday crowd.",
      vehicleInvolved: false,
      vehicleDetails: "",
      
      // FIR Details
      firAvailable: false,
      firNumber: "",
      policeStation: "City Mall Police Booth",
      firDate: "",
      firDocument: null,
      
      // Authority & Police Assignment
      policeStatus: "Awaiting Review",
      policeAssigned: false,
      policeStationName: "Sector 18 Central Police Post",
      policeOfficerName: "Awaiting Duty Officer",
      policeBadgeNumber: "",
      policeContact: "+91 98110 00112",
      policeAssignedTime: "Pending",
      policeLastUpdate: "Emergency report received. Desk officer reviewing camera logs.",
      
      liveLocationActive: false,
      lastSharedLocation: "City Mall Food Court",
      lastLocationTimestamp: "35 minutes ago",

      createdAt: "2026-08-09 11:30",
      updatedAt: "25 minutes ago"
    },
    {
      id: "MC-2026-1092",
      caseNumber: "MC-2026-1092",
      childId: "2",
      childName: "Ananya Sharma",
      childAge: 5,
      childGender: "Female",
      childPhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      status: "Recovered",
      priority: "Medium",
      stageIndex: 9,
      
      // Last Seen
      lastSeenDate: "2026-07-10",
      lastSeenTime: "16:00",
      lastSeenLocation: "Public Park Gate #1, Sector 9",
      locationLandmark: "Near ice cream kiosk",
      latitude: "28.6200",
      longitude: "77.2100",
      lastKnownActivity: "Playing near swings",
      companion: "Daycare caretaker",
      
      // Appearance & Clothing
      clothingTop: "Yellow T-shirt",
      clothingBottom: "Blue denim shorts",
      clothingShoes: "Red sandals",
      accessories: "Pink water bottle",
      height: "105 cm",
      hair: "Short black hair",
      skinTone: "Fair",
      distinctiveMarks: "Light birthmark on back of neck",
      circumstances: "Wandered off near park entrance.",
      vehicleInvolved: false,
      vehicleDetails: "",
      
      // FIR Details
      firAvailable: true,
      firNumber: "FIR-210/2026",
      policeStation: "Sector 9 Police Station",
      firDate: "2026-07-10",
      firDocument: "FIR_210_Resolved.pdf",
      
      // Authority & Police Assignment
      policeStatus: "Closed",
      policeAssigned: true,
      policeStationName: "Sector 9 Police Station",
      policeOfficerName: "Sub-Inspector M. K. Verma",
      policeBadgeNumber: "DL-POL-3321",
      policeContact: "+91 98110 00900",
      policeAssignedTime: "2026-07-10 16:30",
      policeLastUpdate: "Child safely located at neighborhood security post and reunited with parents.",
      
      liveLocationActive: false,
      lastSharedLocation: "Sector 9 Security Station",
      lastLocationTimestamp: "2026-07-10 17:45",

      createdAt: "2026-07-10 16:15",
      updatedAt: "2026-07-10 18:00"
    }
  ]);

  // Potential Matches Data
  const [potentialMatches, setPotentialMatches] = useState([
    {
      id: "pm-101",
      caseId: "MC-2026-8821",
      childId: "3",
      matchPhoto: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      confidenceScore: "94.8%",
      matchDate: "2026-08-08 16:10",
      location: "Metro Station Exit 4B CCTV Camera #12",
      verificationStatus: "Guardian Verification Required",
      isVerified: false,
      notes: "AI facial vector match triggered on public CCTV feed. High confidence match on eye-to-nose geometry."
    },
    {
      id: "pm-102",
      caseId: "MC-2026-8821",
      childId: "3",
      matchPhoto: "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80",
      confidenceScore: "81.2%",
      matchDate: "2026-08-08 15:40",
      location: "Bus Terminal Platform 2",
      verificationStatus: "Under Review by Police Desk",
      isVerified: false,
      notes: "Possible candidate match flagged by citizen upload."
    }
  ]);

  // Citizen Sighting Reports Data
  const [citizenReports, setCitizenReports] = useState([
    {
      id: "cr-501",
      caseId: "MC-2026-8821",
      reporterTag: "Citizen Reporter #482 (Verified)",
      sightingTime: "2026-08-08 15:55",
      location: "Outside Sector 14 Metro Station",
      description: "Saw a child matching description wearing red backpack sitting near tea stall with police constable.",
      photoPreview: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      verificationState: "Verified Sighting"
    }
  ]);

  // Case Timelines Data
  const [caseTimelines, setCaseTimelines] = useState({
    "MC-2026-8821": [
      {
        id: "ctl-1",
        title: "Missing Child Report Submitted",
        desc: "Parent filed emergency red alert report with location coordinates.",
        time: "2026-08-08 15:00",
        actor: "Parent (John Doe)",
        stageIndex: 1
      },
      {
        id: "ctl-2",
        title: "Report Received & Under Desk Review",
        desc: "GuardianLink automated system validated KYC authority.",
        time: "2026-08-08 15:05",
        actor: "GuardianLink AI System",
        stageIndex: 2
      },
      {
        id: "ctl-3",
        title: "Police Station Assigned",
        desc: "Assigned to Delhi Central Metro Police Station - Crime Branch.",
        time: "2026-08-08 15:45",
        actor: "Delhi Police Control Room",
        stageIndex: 3
      },
      {
        id: "ctl-4",
        title: "Investigation Active",
        desc: "Officer Insp. R. S. Rathore initiated camera network scan.",
        time: "2026-08-08 16:00",
        actor: "Police Duty Officer",
        stageIndex: 4
      },
      {
        id: "ctl-5",
        title: "AI Face Vector Potential Match Detected",
        desc: "CCTV Camera #12 at Metro Exit 4B flagged candidate photo with 94.8% confidence.",
        time: "2026-08-08 16:10",
        actor: "GuardianLink AI Neural Engine",
        stageIndex: 5
      }
    ],
    "MC-2026-4431": [
      {
        id: "ctl-10",
        title: "Emergency Missing Report Submitted",
        desc: "Critical priority case reported at City Mall food court.",
        time: "2026-08-09 11:30",
        actor: "Parent (John Doe)",
        stageIndex: 1
      },
      {
        id: "ctl-11",
        title: "Under Desk Review",
        desc: "Dispatch queue assigned to Sector 18 Police Post.",
        time: "2026-08-09 11:35",
        actor: "GuardianLink AI System",
        stageIndex: 2
      }
    ],
    "MC-2026-1092": [
      {
        id: "ctl-20",
        title: "Case Created",
        desc: "Report filed for Ananya Sharma.",
        time: "2026-07-10 16:15",
        actor: "Parent",
        stageIndex: 1
      },
      {
        id: "ctl-21",
        title: "Child Located & Verified",
        desc: "Sighted by park security and reunited with family.",
        time: "2026-07-10 17:45",
        actor: "Security Team",
        stageIndex: 8
      },
      {
        id: "ctl-22",
        title: "Case Formally Closed",
        desc: "Parent confirmed safe recovery. FIR closed.",
        time: "2026-07-10 18:00",
        actor: "Parent / Police",
        stageIndex: 9
      }
    ]
  });

  // Create Case
  const createCase = (casePayload) => {
    const caseNum = `MC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase = {
      ...casePayload,
      id: caseNum,
      caseNumber: caseNum,
      status: "Active",
      stageIndex: 1,
      policeStatus: "Awaiting Review",
      policeAssigned: false,
      policeStationName: casePayload.policeStation || "Central Police Control Room",
      policeOfficerName: "Awaiting Officer Assignment",
      policeBadgeNumber: "",
      policeContact: "+91 98110 00100",
      policeAssignedTime: "Pending",
      policeLastUpdate: "Case queued for immediate authority review.",
      liveLocationActive: false,
      lastSharedLocation: casePayload.lastSeenLocation,
      lastLocationTimestamp: "Just Now",
      createdAt: new Date().toLocaleString(),
      updatedAt: "Just Now"
    };

    const initialTimeline = [
      {
        id: `ctl-${Date.now()}`,
        title: "Missing Child Report Submitted",
        desc: "Emergency report filed by parent.",
        time: "Just Now",
        actor: "Parent Guardian",
        stageIndex: 1
      }
    ];

    setMissingCases((prev) => [newCase, ...prev]);
    setCaseTimelines((prev) => ({ ...prev, [caseNum]: initialTimeline }));

    return newCase;
  };

  // Update Case
  const updateCase = (caseId, updates) => {
    setMissingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            ...updates,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );
  };

  // Verify Match
  const verifyMatch = (caseId, matchId) => {
    setPotentialMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            isVerified: true,
            verificationStatus: "Verified by Guardian"
          };
        }
        return m;
      })
    );

    // Update case stage to Found / Reunification
    setMissingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: "Found",
            stageIndex: 6,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );
  };

  // Close Case
  const closeCase = (caseId, recoveryDetails) => {
    setMissingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: "Closed",
            stageIndex: 9,
            policeStatus: "Closed",
            liveLocationActive: false,
            updatedAt: "Just Now"
          };
        }
        return c;
      })
    );

    const closeTimelineEntry = {
      id: `ctl-close-${Date.now()}`,
      title: "Case Formally Closed - Safe Recovery",
      desc: `Child recovered safely at ${recoveryDetails.location || "verified location"}. Notes: ${recoveryDetails.notes || "None"}`,
      time: "Just Now",
      actor: "Parent Guardian",
      stageIndex: 9
    };

    setCaseTimelines((prev) => ({
      ...prev,
      [caseId]: [...(prev[caseId] || []), closeTimelineEntry]
    }));
  };

  const getCaseById = (caseId) => {
    return missingCases.find((c) => c.id === caseId || c.caseNumber === caseId);
  };

  const getActiveCaseForChild = (childId) => {
    return missingCases.find(
      (c) => c.childId === String(childId) && c.status !== "Closed" && c.status !== "Recovered"
    );
  };

  return (
    <MissingCasesContext.Provider
      value={{
        missingCases,
        potentialMatches,
        citizenReports,
        caseTimelines,
        createCase,
        updateCase,
        verifyMatch,
        closeCase,
        getCaseById,
        getActiveCaseForChild
      }}
    >
      {children}
    </MissingCasesContext.Provider>
  );
};
