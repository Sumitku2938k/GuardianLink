import React, { createContext, useContext, useState } from "react";

const NgoContext = createContext();

export const useNgo = () => {
  const context = useContext(NgoContext);
  if (!context) {
    throw new Error("useNgo must be used within an NgoProvider");
  }
  return context;
};

export const NgoProvider = ({ children }) => {
  // Active NGO Organization Profile
  const [currentNgo, setCurrentNgo] = useState({
    name: "Helping Hands Child Foundation",
    registrationNumber: "NGO-DL-2024-9841",
    verificationStatus: "Verified Non-Profit Shelter",
    address: "Community Shelter Kiosk, Sector 12, Delhi",
    phone: "+91 11 2617 2000",
    email: "contact@helpinghands.org",
    logo: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=150&auto=format&fit=crop&q=80"
  });

  // Shelter Capacity Info
  const [shelterInfo, setShelterInfo] = useState({
    totalCapacity: 20,
    occupied: 8,
    available: 12,
    pendingIntake: 2,
    staffCount: 12,
    facilities: [
      { name: "Emergency Medical Care Room", status: "Operational" },
      { name: "Child Resting & Sleeping Dormitory", status: "Operational" },
      { name: "Nutrition & Food Kitchen Kiosk", status: "Operational" },
      { name: "Child Counseling Room", status: "Active Staffed" }
    ]
  });

  // Children Currently in NGO Shelter Care
  const [childrenInCare, setChildrenInCare] = useState([
    {
      id: "3",
      childReference: "Kabir Mehta",
      caseNumber: "MC-2026-8821",
      intakeId: "IN-2026-8801",
      approxAge: 10,
      gender: "Male",
      photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      receivedDate: "2026-08-08 16:45",
      timeInShelter: "3 days in care",
      careStatus: "Awaiting Verification", // Newly Received, Under Assessment, Stable, Medical Attention, Awaiting Verification, Reunification Pending, Transfer Pending, Released
      medicalStatus: "Monitoring", // Stable, Monitoring, Medical Attention Required, Emergency
      safetyState: "Safe in Dormitory",
      assignedDorm: "Dorm B - Bed 04",
      guardianVerificationStatus: "Guardian Located - Identity Match 94.8%",
      policeStation: "Delhi Central Metro Police Post",
      assignedOfficer: "Insp. R. S. Rathore",
      intakeSource: "Citizen Sighting at Sector 14 Metro",

      // Care Needs
      foodProvided: true,
      waterProvided: true,
      clothingProvided: true,
      restingAreaProvided: true,
      emotionalState: "Calm & Reassured",
      careNotes: "Provided warm dinner and clean T-shirt. Participating in reading activity."
    },
    {
      id: "4",
      childReference: "Rhea Kapoor",
      caseNumber: "MC-2026-4431",
      intakeId: "IN-2026-4412",
      approxAge: 7,
      gender: "Female",
      photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&auto=format&fit=crop&q=80",
      receivedDate: "2026-08-09 12:30",
      timeInShelter: "2 days in care",
      careStatus: "Under Assessment",
      medicalStatus: "Medical Attention Required",
      safetyState: "In Medical Observation Ward",
      assignedDorm: "Medical Ward - Bed 01",
      guardianVerificationStatus: "Pending Police Desk Review",
      policeStation: "Sector 18 Police Post",
      assignedOfficer: "Insp. V. K. Sharma",
      intakeSource: "Police Escort from City Mall",

      foodProvided: true,
      waterProvided: true,
      clothingProvided: true,
      restingAreaProvided: true,
      emotionalState: "Anxious - Seeking Mother",
      careNotes: "Mild fever treated by shelter doctor. Counselor conducting play therapy."
    },
    {
      id: "5",
      childReference: "Aryan Kumar (Ref #CR-2026-3180)",
      caseNumber: "CR-2026-3180",
      intakeId: "IN-2026-3110",
      approxAge: 6,
      gender: "Male",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
      receivedDate: "2026-08-10 12:00",
      timeInShelter: "1 day in care",
      careStatus: "Stable",
      medicalStatus: "Stable",
      safetyState: "Safe in Play Area",
      assignedDorm: "Dorm A - Bed 02",
      guardianVerificationStatus: "Searching Records",
      policeStation: "Railway Protection Force Post",
      assignedOfficer: "Sub-Insp. M. K. Verma",
      intakeSource: "Railway Protection Force Escort",

      foodProvided: true,
      waterProvided: true,
      clothingProvided: true,
      restingAreaProvided: true,
      emotionalState: "Happy & Playful",
      careNotes: "Basic needs provided. Resting comfortably."
    }
  ]);

  // Care Wellbeing Logs per Child
  const [careLogs, setCareLogs] = useState({
    "3": [
      { id: "cl-1", category: "Nutrition", status: "Completed", time: "Today, 13:00", text: "Provided lunch (Rice, Lentils, Fruit Juice). Child finished entire meal.", staff: "Sister Maria" },
      { id: "cl-2", category: "Emotional Support", status: "Completed", time: "Today, 10:30", text: "Child participated in drawing session. Expressed feeling safe and calm.", staff: "Counselor Anita" },
      { id: "cl-3", category: "Clothing", status: "Completed", time: "Yesterday, 18:00", text: "Issued fresh jacket and clean socks.", staff: "Sister Maria" }
    ],
    "4": [
      { id: "cl-10", category: "Medical Care", status: "Monitoring", time: "Today, 11:00", text: "Fever reduced to 98.6°F after medication administered by Dr. Roy.", staff: "Nurse Priya" }
    ]
  });

  // Transfers Roster
  const [transfers, setTransfers] = useState([
    {
      id: "TR-2026-101",
      childReference: "Rhea Kapoor (Case #MC-2026-4431)",
      fromFacility: "Helping Hands Shelter - Sector 12",
      toFacility: "City Children's Hospital - Pediatric Unit",
      reason: "Specialized Pediatric Fever Observation",
      scheduledTime: "2026-08-10 15:00",
      status: "Scheduled", // Requested, Approved, Scheduled, In Transit, Completed, Cancelled
      responsibleStaff: "Dr. Roy & Nurse Priya"
    }
  ]);

  // NGO Notifications Center
  const [ngoNotifications, setNgoNotifications] = useState([
    {
      id: "nn-1",
      title: "Reunification Handover Ready",
      message: "Guardian John Mehta verified by police for Kabir Mehta (Case #MC-2026-8821).",
      time: "20 mins ago",
      type: "success",
      isRead: false
    },
    {
      id: "nn-2",
      title: "Medical Observation Update",
      message: "Rhea Kapoor's temperature stabilized in Medical Ward.",
      time: "1 hour ago",
      type: "info",
      isRead: false
    },
    {
      id: "nn-3",
      title: "Shelter Occupancy Notice",
      message: "Shelter currently at 40% capacity (12 available spaces remaining).",
      time: "3 hours ago",
      type: "info",
      isRead: true
    }
  ]);

  // NGO Station Analytics
  const [ngoAnalytics, setNgoAnalytics] = useState({
    childrenAssisted: 54,
    reunificationRate: "88.5%",
    avgTimeInCare: "3.4 Days",
    medicalCasesCount: 6,
    occupancyRate: "40%"
  });

  // Functions

  // Complete Intake Workflow
  const completeIntake = (intakePayload) => {
    const intakeNum = `IN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newChildRecord = {
      id: String(Date.now()),
      childReference: intakePayload.childReference || `Child Ref #${intakeNum}`,
      caseNumber: intakePayload.caseNumber || "Pending Case ID",
      intakeId: intakeNum,
      approxAge: intakePayload.approxAge || 7,
      gender: intakePayload.gender || "Child",
      photo: intakePayload.photo || "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
      receivedDate: new Date().toLocaleString(),
      timeInShelter: "Just Received",
      careStatus: "Newly Received",
      medicalStatus: intakePayload.medicalNeeded ? "Medical Attention Required" : "Stable",
      safetyState: "Safe in Intake Room",
      assignedDorm: "Intake Ward - Bed 01",
      guardianVerificationStatus: "Initiating Search",
      policeStation: intakePayload.policeStation || "Central Police Post",
      assignedOfficer: "Assigned Police Officer",
      intakeSource: intakePayload.intakeSource || "Citizen / Police Escort",

      foodProvided: true,
      waterProvided: true,
      clothingProvided: true,
      restingAreaProvided: true,
      emotionalState: intakePayload.emotionalState || "Calm",
      careNotes: intakePayload.careNotes || "Intake completed smoothly."
    };

    setChildrenInCare((prev) => [newChildRecord, ...prev]);
    setShelterInfo((prev) => ({
      ...prev,
      occupied: prev.occupied + 1,
      available: Math.max(0, prev.available - 1)
    }));

    return newChildRecord;
  };

  // Record Daily Care Update Log
  const recordCareUpdate = (childId, updateData) => {
    const newLog = {
      id: `cl-${Date.now()}`,
      category: updateData.category || "General Wellbeing",
      status: "Completed",
      time: "Just Now",
      text: updateData.notes,
      staff: currentNgo.name + " Staff"
    };

    setCareLogs((prev) => ({
      ...prev,
      [childId]: [newLog, ...(prev[childId] || [])]
    }));
  };

  // Update Care Status
  const updateCareStatus = (childId, newStatus) => {
    setChildrenInCare((prev) =>
      prev.map((c) => {
        if (c.id === childId || c.childReference === childId) {
          return {
            ...c,
            careStatus: newStatus
          };
        }
        return c;
      })
    );
  };

  // Create Shelter Transfer
  const createTransfer = (transferData) => {
    const transferNum = `TR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTransfer = {
      ...transferData,
      id: transferNum,
      status: "Scheduled"
    };
    setTransfers((prev) => [newTransfer, ...prev]);
    return newTransfer;
  };

  // Confirm Handover and Safe Release of Child to Verified Guardian
  const confirmHandover = (childId, handoverDetails) => {
    setChildrenInCare((prev) =>
      prev.map((c) => {
        if (c.id === childId || c.childReference === childId) {
          return {
            ...c,
            careStatus: "Released",
            safetyState: `Safely Reunited at ${handoverDetails.location || "Verified Location"}`
          };
        }
        return c;
      })
    );

    setShelterInfo((prev) => ({
      ...prev,
      occupied: Math.max(0, prev.occupied - 1),
      available: prev.available + 1
    }));
  };

  const getChildById = (childId) => {
    return childrenInCare.find((c) => c.id === childId || c.childReference === childId || c.caseNumber === childId);
  };

  return (
    <NgoContext.Provider
      value={{
        currentNgo,
        shelterInfo,
        childrenInCare,
        intakeRecords: childrenInCare,
        transfers,
        careLogs,
        ngoNotifications,
        ngoAnalytics,
        completeIntake,
        recordCareUpdate,
        updateCareStatus,
        createTransfer,
        confirmHandover,
        getChildById
      }}
    >
      {children}
    </NgoContext.Provider>
  );
};
