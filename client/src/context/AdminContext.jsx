import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { user: authUser } = useAuth();
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Current Admin User Details
  const [currentAdmin, setCurrentAdmin] = useState({
    id: "ADM-8801",
    name: "Platform Administrator",
    email: "admin@guardianlink.local",
    role: "System Admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    phone: "+91 98765 00001",
    securityStatus: "2FA Enabled • System Clearance",
    lastLogin: "Active Now"
  });

  // Default baseline organizations
  const defaultOrganizations = [
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
  ];

  // Users Dataset
  const [users, setUsers] = useState([]);

  // Organizations Dataset (Police Posts & NGOs)
  const [organizations, setOrganizations] = useState(defaultOrganizations);

  // Platform Overall Overview Stats
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    registeredChildren: 8642,
    activeMissingCases: 24,
    activeFoundReports: 18,
    recoveredChildren: 5284,
    verifiedOrganizations: 2,
    pendingVerifications: 0,
    systemAlertsCount: 3,
    lastUpdate: "Just now"
  });

  // Base Critical Administrative Alerts
  const baseAlerts = [
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
  ];

  const [criticalAlerts, setCriticalAlerts] = useState(baseAlerts);

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

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get("/api/admin/users");
      if (res.data && res.data.success && Array.isArray(res.data.users)) {
        const mappedUsers = res.data.users.map((u) => {
          const roleDisplay =
            u.role === "ngo"
              ? "NGO"
              : u.role === "police"
              ? "Police"
              : u.role === "citizen"
              ? "Citizen"
              : u.role === "parent"
              ? "Parent"
              : u.role === "admin"
              ? "Admin"
              : u.role;

          const verificationStatus =
            u.status === "approved" || (u.isVerified && u.status !== "pending" && u.status !== "rejected")
              ? "Verified"
              : u.status === "rejected"
              ? "Rejected"
              : "Pending";

          const accountStatus = u.status === "suspended" ? "Suspended" : "Active";

          const registeredDate = u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "Recent";

          return {
            id: u.id || u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: roleDisplay,
            rawRole: u.role,
            status: u.status,
            verificationStatus,
            accountStatus,
            registeredDate,
            lastActive: u.lastLogin ? "Recent" : "Never",
            organization: u.organization || "",
            city: u.city || "",
            state: u.state || "",
            rejectionReason: u.rejectionReason || "",
            avatar:
              u.profilePhoto ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=4f46e5&color=fff`
          };
        });

        setUsers(mappedUsers);

        // Derive live organizations for Police and NGO accounts from MongoDB users
        const liveOrgs = mappedUsers
          .filter((u) => u.rawRole === "police" || u.rawRole === "ngo")
          .map((u) => {
            const isPolice = u.rawRole === "police";
            const defaultOrgName = isPolice ? `${u.name}'s Police Post` : `${u.name}'s NGO Shelter`;
            const orgName = (u.organization && u.organization.trim()) || defaultOrgName;
            const locParts = [u.city, u.state].filter(Boolean);
            const location = locParts.length > 0 ? locParts.join(", ") : "New Delhi, Delhi";

            return {
              id: u.id,
              userId: u.id,
              name: orgName,
              type: isPolice ? "Police" : "NGO",
              location,
              verificationStatus: u.verificationStatus,
              status: u.accountStatus === "Suspended" ? "Suspended" : "Active",
              membersCount: isPolice ? 28 : 14,
              registeredDate: u.registeredDate,
              shelterCapacity: isPolice ? undefined : 25,
              currentOccupancy: isPolice ? undefined : 0,
              activeCases: isPolice ? 0 : undefined,
              contactPerson: u.name,
              phone: u.phone,
              email: u.email
            };
          });

        const liveEmails = new Set(liveOrgs.map((o) => (o.email || "").toLowerCase()));
        const liveNames = new Set(liveOrgs.map((o) => (o.name || "").toLowerCase()));
        const preservedDefaults = defaultOrganizations.filter(
          (d) => !liveEmails.has((d.email || "").toLowerCase()) && !liveNames.has((d.name || "").toLowerCase())
        );

        setOrganizations([...liveOrgs, ...preservedDefaults]);

        // Dynamic alerts for pending verifications
        const pendingUsers = mappedUsers.filter((u) => u.verificationStatus === "Pending");
        const pendingCount = pendingUsers.length;
        const verifiedOrgs = mappedUsers.filter(
          (u) => (u.rawRole === "police" || u.rawRole === "ngo") && u.verificationStatus === "Verified"
        ).length;

        const dynamicVerifAlerts = pendingUsers.map((u) => ({
          id: `ALT-PENDING-${u.id}`,
          severity: "High",
          title: `Pending ${u.role} Verification Request`,
          time: u.registeredDate || "Recent",
          module: "Organizations",
          action: "Review Credentials",
          description: `${u.name} submitted registration for "${u.organization || u.role}" in ${[u.city, u.state].filter(Boolean).join(", ") || "India"}.`
        }));

        setCriticalAlerts([...dynamicVerifAlerts, ...baseAlerts]);

        setPlatformStats((prev) => ({
          ...prev,
          totalUsers: mappedUsers.length,
          pendingVerifications: pendingCount,
          verifiedOrganizations: verifiedOrgs,
          lastUpdate: "Just now"
        }));
      }
    } catch (err) {
      console.warn("Could not fetch admin users from backend:", err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Sync currentAdmin with logged-in admin user and fetch live users
  useEffect(() => {
    if (authUser && authUser.role === "admin") {
      setCurrentAdmin({
        id: authUser.id || "ADM-001",
        name: authUser.name || "GuardianLink Administrator",
        email: authUser.email,
        role: "System Administrator",
        avatar:
          authUser.profilePhoto ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || "Admin")}&background=4f46e5&color=fff`,
        phone: authUser.phone || "+91 98765 00001",
        securityStatus: "2FA Enabled • System Clearance",
        lastLogin: "Active Now"
      });
      fetchUsers();
    }
  }, [authUser]);

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
  const handleApproveUser = async (userId) => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/approve`);
      if (res.data && res.data.success) {
        await fetchUsers();
        const newAudit = {
          id: `AUD-${Date.now().toString().slice(-4)}`,
          timestamp: "Just now",
          actor: currentAdmin.name,
          role: "Admin",
          action: `Approved account verification for user ID ${userId}`,
          entity: "User",
          entityId: userId,
          result: "Approved"
        };
        setAuditLogs((prev) => [newAudit, ...prev]);
        return res.data;
      }
    } catch (err) {
      console.error("Failed to approve user:", err);
      throw err;
    }
  };

  const handleRejectUser = async (userId, rejectionReason) => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/reject`, { rejectionReason });
      if (res.data && res.data.success) {
        await fetchUsers();
        const newAudit = {
          id: `AUD-${Date.now().toString().slice(-4)}`,
          timestamp: "Just now",
          actor: currentAdmin.name,
          role: "Admin",
          action: `Rejected account verification. Reason: ${rejectionReason || "Credentials could not be verified."}`,
          entity: "User",
          entityId: userId,
          result: "Rejected"
        };
        setAuditLogs((prev) => [newAudit, ...prev]);
        return res.data;
      }
    } catch (err) {
      console.error("Failed to reject user:", err);
      throw err;
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
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

  const handleSuspendUser = async (userId, reason) => {
    try {
      await api.patch(`/api/admin/users/${userId}/suspend`, { reason });
      await fetchUsers();
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, accountStatus: "Suspended" } : u))
      );
    }
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

  const handleActivateUser = async (userId) => {
    try {
      await api.patch(`/api/admin/users/${userId}/activate`);
      await fetchUsers();
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, accountStatus: "Active" } : u))
      );
    }
  };

  const handleVerifyOrganization = async (orgId, decision, rejectionReason = "") => {
    try {
      // Find matching user by id or org email
      const org = organizations.find((o) => o.id === orgId);
      const matchedUser = users.find(
        (u) =>
          u.id === orgId ||
          (org && u.email && u.email.toLowerCase() === (org.email || "").toLowerCase()) ||
          (org && u.organization && u.organization.toLowerCase() === (org.name || "").toLowerCase())
      );
      const targetUserId = matchedUser ? matchedUser.id : orgId;

      if (decision === "Verified") {
        await handleApproveUser(targetUserId);
      } else if (decision === "Rejected") {
        await handleRejectUser(targetUserId, rejectionReason || "Organization credentials rejected.");
      }

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
    } catch (err) {
      console.error("Failed to verify organization:", err);
      throw err;
    }
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
        isLoadingUsers,
        fetchUsers,
        organizations,
        adminCases,
        adminReports,
        aiMetrics,
        aiIncidents,
        notificationsLog,
        auditLogs,
        systemSettings,
        setSystemSettings,
        handleApproveUser,
        handleRejectUser,
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
