import React, { createContext, useContext, useState } from "react";

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  // Current Admin User Details
  const [currentAdmin, setCurrentAdmin] = useState({
    id: "ADM-8801",
    name: "Dr. Vikram Sethi",
    email: "admin.vikram@guardianlink.gov.in",
    role: "Super Admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    phone: "+91 98110 00999",
    securityStatus: "2FA Enabled • High Clearance",
    lastLogin: "Today, 08:30 AM"
  });

  // Platform Overall Overview Stats
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 12482,
    registeredChildren: 8642,
    activeMissingCases: 24,
    activeFoundReports: 18,
    recoveredChildren: 5284,
    verifiedOrganizations: 126,
    pendingVerifications: 14,
    systemAlertsCount: 3,
    lastUpdate: "Just now"
  });

  // Critical Administrative Alerts
  const [criticalAlerts, setCriticalAlerts] = useState([
    {
      id: "ALT-901",
      severity: "High",
      title: "Pending NGO Verification Request",
      time: "10 mins ago",
      module: "Organizations",
      action: "Review Credentials",
      description: "Bachpan Safe Shelter Kiosk submitted new licensing documents."
    },
    {
      id: "ALT-902",
      severity: "Critical",
      title: "High Priority Missing Case Reported",
      time: "25 mins ago",
      module: "Cases",
      action: "Inspect Case",
      description: "Case #MC-2026-9901 (Ananya Sharma, 6 yrs) assigned to Connaught Place Station."
    },
    {
      id: "ALT-903",
      severity: "Warning",
      title: "AI Match Verification Queue Backlog",
      time: "1 hr ago",
      module: "AI Monitoring",
      action: "View Queue",
      description: "4 potential facial matches awaiting human verification by police escorts."
    }
  ]);

  // Real-time Platform Activity Feed
  const [activityFeed, setActivityFeed] = useState([
    {
      id: "ACT-101",
      actor: "Rajesh Sharma",
      role: "Parent",
      action: "Registered child Aadhav (Ref #CH-8802)",
      time: "5 mins ago",
      status: "Success"
    },
    {
      id: "ACT-102",
      actor: "Anjali Gupta",
      role: "Citizen",
      action: "Submitted Found Child Report #FR-2026-0044",
      time: "12 mins ago",
      status: "Review Needed"
    },
    {
      id: "ACT-103",
      actor: "Insp. R. S. Rathore",
      role: "Police",
      action: "Updated Case #MC-2026-8821 investigation log",
      time: "30 mins ago",
      status: "In Progress"
    },
    {
      id: "ACT-104",
      actor: "Helping Hands Shelter",
      role: "NGO",
      action: "Completed safe intake #IN-2026-0412",
      time: "45 mins ago",
      status: "Sheltered"
    },
    {
      id: "ACT-105",
      actor: "GuardianLink AI Engine",
      role: "System AI",
      action: "Generated 94.2% facial similarity candidate for Case #MC-8821",
      time: "1 hr ago",
      status: "Match Pending"
    }
  ]);

  // Users Dataset
  const [users, setUsers] = useState([
    {
      id: "USR-1001",
      name: "Sunita Sharma",
      email: "sunita.sharma@example.com",
      phone: "+91 98765 43210",
      role: "Parent",
      verificationStatus: "Verified",
      accountStatus: "Active",
      registeredDate: "12 Jan 2026",
      lastActive: "10 mins ago",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: "USR-1002",
      name: "Amit Verma",
      email: "amit.verma@example.com",
      phone: "+91 98111 22334",
      role: "Citizen",
      verificationStatus: "Verified",
      accountStatus: "Active",
      registeredDate: "18 Feb 2026",
      lastActive: "1 hr ago",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: "USR-1003",
      name: "Insp. R. S. Rathore",
      email: "rathore.rs@delhipolice.gov.in",
      phone: "+91 98222 33445",
      role: "Police",
      verificationStatus: "Verified",
      accountStatus: "Active",
      registeredDate: "05 Nov 2025",
      lastActive: "Just now",
      organization: "Delhi Central Metro Police",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: "USR-1004",
      name: "Pooja Deshmukh",
      email: "pooja@helpinghandsngo.org",
      phone: "+91 98333 44556",
      role: "NGO",
      verificationStatus: "Verified",
      accountStatus: "Active",
      registeredDate: "01 Dec 2025",
      lastActive: "5 mins ago",
      organization: "Helping Hands Shelter",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: "USR-1005",
      name: "Rohan Kapoor",
      email: "rohan.k@example.com",
      phone: "+91 98444 55667",
      role: "Citizen",
      verificationStatus: "Pending",
      accountStatus: "Active",
      registeredDate: "Yesterday",
      lastActive: "3 hrs ago",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150"
    },
    {
      id: "USR-1006",
      name: "Vikas Malhotra",
      email: "vikas.m@suspicious.com",
      phone: "+91 98555 66778",
      role: "Citizen",
      verificationStatus: "Rejected",
      accountStatus: "Suspended",
      registeredDate: "10 Feb 2026",
      lastActive: "2 days ago",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150"
    }
  ]);

  // Organizations Dataset (Police Posts & NGOs)
  const [organizations, setOrganizations] = useState([
    {
      id: "ORG-PL-01",
      name: "Delhi Central Metro Police Station",
      type: "Police",
      location: "Sector 12, New Delhi",
      verificationStatus: "Verified",
      status: "Active",
      membersCount: 42,
      registeredDate: "10 Aug 2024",
      activeCases: 8,
      contactPerson: "Insp. R. S. Rathore",
      phone: "+91 11 2345 6789",
      email: "metro.central@delhipolice.gov.in"
    },
    {
      id: "ORG-NGO-01",
      name: "Helping Hands Child Shelter Kiosk",
      type: "NGO",
      location: "Sector 12, New Delhi",
      verificationStatus: "Verified",
      status: "Active",
      membersCount: 18,
      registeredDate: "15 Jan 2025",
      shelterCapacity: 20,
      currentOccupancy: 8,
      contactPerson: "Pooja Deshmukh",
      phone: "+91 98333 44556",
      email: "shelter@helpinghandsngo.org"
    },
    {
      id: "ORG-NGO-02",
      name: "Bachpan Safe Haven Foundation",
      type: "NGO",
      location: "Sector 18, Noida",
      verificationStatus: "Pending",
      status: "Active",
      membersCount: 12,
      registeredDate: "14 Feb 2026",
      shelterCapacity: 35,
      currentOccupancy: 14,
      contactPerson: "Suresh Menon",
      phone: "+91 98777 88990",
      email: "info@bachpansafe.org"
    },
    {
      id: "ORG-PL-02",
      name: "Connaught Place Police Post",
      type: "Police",
      location: "CP Central, New Delhi",
      verificationStatus: "Verified",
      status: "Active",
      membersCount: 55,
      registeredDate: "01 Jun 2024",
      activeCases: 12,
      contactPerson: "ACP K. L. Sharma",
      phone: "+91 11 2334 1122",
      email: "cp.station@delhipolice.gov.in"
    }
  ]);

  // Platform Cases Oversight Dataset
  const [adminCases, setAdminCases] = useState([
    {
      id: "MC-2026-8821",
      childReference: "Kabir Mehta",
      priority: "Critical",
      status: "Potential Match",
      policeStation: "Delhi Central Metro Police",
      ngoInvolved: "Helping Hands Shelter",
      createdDate: "Today, 08:30 AM",
      lastUpdated: "15 mins ago",
      matchConfidence: "94.2%",
      approxAge: 10,
      photo: "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&q=80&w=200"
    },
    {
      id: "MC-2026-9901",
      childReference: "Ananya Sharma",
      priority: "High",
      status: "Investigating",
      policeStation: "Connaught Place Police Post",
      ngoInvolved: "None",
      createdDate: "Today, 10:15 AM",
      lastUpdated: "40 mins ago",
      matchConfidence: "N/A",
      approxAge: 6,
      photo: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=200"
    },
    {
      id: "MC-2026-7734",
      childReference: "Aarav Kumar",
      priority: "Normal",
      status: "Recovered",
      policeStation: "Delhi Central Metro Police",
      ngoInvolved: "Helping Hands Shelter",
      createdDate: "14 Feb 2026",
      lastUpdated: "Yesterday",
      matchConfidence: "98.1%",
      approxAge: 8,
      photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200"
    }
  ]);

  // Citizen Found Child Reports
  const [adminReports, setAdminReports] = useState([
    {
      id: "FR-2026-0044",
      type: "Found Child Report",
      submittedBy: "Amit Verma (Citizen)",
      relatedCase: "MC-2026-8821",
      location: "Sector 12 Metro Station",
      status: "Under Review",
      createdDate: "Today, 09:10 AM",
      lastUpdated: "12 mins ago"
    },
    {
      id: "FR-2026-0039",
      type: "Sighting Tip",
      submittedBy: "Meera Nair (Citizen)",
      relatedCase: "MC-2026-9901",
      location: "Rajiv Chowk Gate #2",
      status: "New",
      createdDate: "Today, 11:00 AM",
      lastUpdated: "Today, 11:00 AM"
    }
  ]);

  // AI Monitoring System Data
  const [aiMetrics, setAiMetrics] = useState({
    aiServiceStatus: "Operational",
    faceDetectionStatus: "Operational",
    faceMatchingStatus: "Operational",
    processingQueue: "2 Items",
    errorRate: "0.04%",
    avgProcessingTime: "1.4 seconds",
    totalAttemptsToday: 482,
    potentialMatchesFound: 14,
    humanVerifiedRate: "92.8%",
    matchQuality: {
      highSimilarity: 68,
      mediumSimilarity: 24,
      lowSimilarity: 8,
      humanVerified: 86,
      rejected: 14
    }
  });

  // AI Incidents Log
  const [aiIncidents, setAiIncidents] = useState([
    {
      id: "INC-801",
      title: "Low Lighting Sighting Image Processed",
      timestamp: "Today, 07:15 AM",
      severity: "Info",
      status: "Resolved",
      details: "Face bounding box confidence 78%. Sent for manual police inspection."
    }
  ]);

  // Notifications Log (Platform Level)
  const [notificationsLog, setNotificationsLog] = useState([
    {
      id: "NTF-501",
      type: "Push Notification",
      recipientRole: "Police & Parent",
      relatedCase: "MC-2026-8821",
      title: "Potential Facial Match Identified",
      status: "Delivered",
      sentAt: "Today, 09:12 AM",
      deliveredAt: "Today, 09:12 AM"
    },
    {
      id: "NTF-502",
      type: "SMS Alert",
      recipientRole: "Verified NGO",
      relatedCase: "IN-2026-0412",
      title: "Child Shelter Intake Confirmation",
      status: "Delivered",
      sentAt: "Today, 08:45 AM",
      deliveredAt: "Today, 08:46 AM"
    },
    {
      id: "NTF-503",
      type: "Email Alert",
      recipientRole: "NGO Admin",
      relatedCase: "ORG-NGO-02",
      title: "Licensing Document Request",
      status: "Failed",
      sentAt: "Yesterday, 18:00",
      deliveredAt: "N/A"
    }
  ]);

  // Immutable Audit Logs Dataset
  const [auditLogs, setAuditLogs] = useState([
    {
      id: "AUD-9901",
      timestamp: "Today, 11:15 AM",
      actor: "Dr. Vikram Sethi",
      role: "Admin",
      action: "Verified NGO Organization",
      entity: "Organization",
      entityId: "ORG-NGO-01",
      result: "Approved"
    },
    {
      id: "AUD-9902",
      timestamp: "Today, 10:40 AM",
      actor: "Insp. R. S. Rathore",
      role: "Police",
      action: "Updated Case Verification Status",
      entity: "Case",
      entityId: "MC-2026-8821",
      result: "Confirmed Match"
    },
    {
      id: "AUD-9903",
      timestamp: "Today, 09:30 AM",
      actor: "System AI",
      role: "System",
      action: "Generated Candidate Match",
      entity: "AI Match",
      entityId: "MATCH-8821-44",
      result: "Candidate Logged"
    },
    {
      id: "AUD-9904",
      timestamp: "Yesterday, 16:20",
      actor: "Dr. Vikram Sethi",
      role: "Admin",
      action: "Suspended User Account",
      entity: "User",
      entityId: "USR-1006",
      result: "Suspended"
    }
  ]);

  // Mock Settings State
  const [systemSettings, setSystemSettings] = useState({
    autoEmailAlerts: true,
    pushNotificationsEnabled: true,
    aiSimilarityThreshold: 85,
    requireHumanVerification: true, // Human-in-the-loop requirement
    sessionTimeoutMinutes: 30,
    twoFactorEnforced: true,
    maintenanceMode: false
  });

  // Admin Actions & Handler Functions
  const handleUpdateUserRole = (userId, newRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    const newAudit = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: "Just now",
      actor: currentAdmin.name,
      role: "Admin",
      action: `Changed user role to ${newRole}`,
      entity: "User",
      entityId: userId,
      result: "Success"
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleSuspendUser = (userId, reason) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, accountStatus: "Suspended" } : u))
    );
    const newAudit = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: "Just now",
      actor: currentAdmin.name,
      role: "Admin",
      action: `Suspended account. Reason: ${reason}`,
      entity: "User",
      entityId: userId,
      result: "Suspended"
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleActivateUser = (userId) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, accountStatus: "Active" } : u))
    );
  };

  const handleVerifyOrganization = (orgId, decision) => {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, verificationStatus: decision } : o))
    );
    const newAudit = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: "Just now",
      actor: currentAdmin.name,
      role: "Admin",
      action: `Organization verification decision: ${decision}`,
      entity: "Organization",
      entityId: orgId,
      result: decision
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleRetryNotification = (ntfId) => {
    setNotificationsLog((prev) =>
      prev.map((n) => (n.id === ntfId ? { ...n, status: "Delivered", deliveredAt: "Just now" } : n))
    );
  };

  const handleEscalateCase = (caseId, note) => {
    setAdminCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, priority: "Critical" } : c))
    );
    const newAudit = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: "Just now",
      actor: currentAdmin.name,
      role: "Admin",
      action: `Escalated case priority. Note: ${note}`,
      entity: "Case",
      entityId: caseId,
      result: "Escalated"
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  return (
    <AdminContext.Provider
      value={{
        currentAdmin,
        platformStats,
        criticalAlerts,
        activityFeed,
        users,
        organizations,
        adminCases,
        adminReports,
        aiMetrics,
        aiIncidents,
        notificationsLog,
        auditLogs,
        systemSettings,
        setSystemSettings,
        handleUpdateUserRole,
        handleSuspendUser,
        handleActivateUser,
        handleVerifyOrganization,
        handleRetryNotification,
        handleEscalateCase
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
