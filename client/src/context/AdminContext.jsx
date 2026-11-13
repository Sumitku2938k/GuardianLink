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

  // Users Dataset
  const [users, setUsers] = useState([]);

  // Organizations Dataset (Police Posts & NGOs derived from approved accounts)
  const [organizations, setOrganizations] = useState([]);

  // Platform Overall Overview Stats
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    registeredChildren: 0,
    activeMissingCases: 0,
    activeFoundReports: 0,
    recoveredChildren: 0,
    verifiedOrganizations: 0,
    pendingVerifications: 0,
    systemAlertsCount: 0,
    lastUpdate: "Just now"
  });

  // Critical Administrative Alerts
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  // Real-time Platform Activity Feed
  const [activityFeed, setActivityFeed] = useState([]);

  // Platform Cases Oversight Dataset
  const [adminCases, setAdminCases] = useState([]);

  // Citizen Found Child Reports
  const [adminReports, setAdminReports] = useState([]);

  // AI Monitoring System Data
  const [aiMetrics, setAiMetrics] = useState({
    aiServiceStatus: "Operational",
    faceDetectionStatus: "Operational",
    faceMatchingStatus: "Operational",
    processingQueue: "0 Items",
    errorRate: "0.0%",
    avgProcessingTime: "N/A",
    totalAttemptsToday: 0,
    potentialMatchesFound: 0,
    humanVerifiedRate: "N/A",
    matchQuality: {
      highSimilarity: 0,
      mediumSimilarity: 0,
      lowSimilarity: 0,
      humanVerified: 0,
      rejected: 0
    }
  });

  // AI Incidents Log
  const [aiIncidents, setAiIncidents] = useState([]);

  // Notifications Log (Platform Level)
  const [notificationsLog, setNotificationsLog] = useState([]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const [usersRes, casesRes, auditRes] = await Promise.allSettled([
        api.get("/api/admin/users"),
        api.get("/api/cases"),
        api.get("/api/admin/audit-logs?limit=20")
      ]);

      let mappedUsers = [];
      if (usersRes.status === "fulfilled" && usersRes.value.data?.success && Array.isArray(usersRes.value.data.users)) {
        mappedUsers = usersRes.value.data.users.map((u) => {
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
            const location = locParts.length > 0 ? locParts.join(", ") : "Jurisdiction on record";

            return {
              id: u.id,
              userId: u.id,
              name: orgName,
              type: isPolice ? "Police" : "NGO",
              location,
              verificationStatus: u.verificationStatus,
              status: u.accountStatus === "Suspended" ? "Suspended" : "Active",
              membersCount: 1,
              registeredDate: u.registeredDate,
              shelterCapacity: isPolice ? undefined : 20,
              currentOccupancy: isPolice ? undefined : 0,
              activeCases: isPolice ? 0 : undefined,
              contactPerson: u.name,
              phone: u.phone,
              email: u.email
            };
          });

        setOrganizations(liveOrgs);

        // Dynamic alerts for pending verifications
        const pendingUsers = mappedUsers.filter((u) => u.verificationStatus === "Pending");
        const dynamicVerifAlerts = pendingUsers.map((u) => ({
          id: `ALT-PENDING-${u.id}`,
          severity: "High",
          title: `Pending ${u.role} Verification Request`,
          time: u.registeredDate || "Recent",
          module: "Organizations",
          action: "Review Credentials",
          description: `${u.name} submitted registration for "${u.organization || u.role}".`
        }));

        setCriticalAlerts(dynamicVerifAlerts);
      }

      let loadedCases = [];
      if (casesRes.status === "fulfilled" && casesRes.value.data?.cases) {
        loadedCases = casesRes.value.data.cases.map((c) => ({
          id: c.caseNumber || c.id || c._id,
          rawId: c.id || c._id,
          childReference: c.childName || "Child",
          priority: c.priority === "high" || c.priority === "High" ? "Critical" : "Normal",
          status: c.status === "found" || c.status === "reunited" ? "Recovered" : "Investigating",
          policeStation: c.assignedStation || "Investigating Unit",
          ngoInvolved: "None",
          createdDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recent",
          lastUpdated: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Recent",
          matchConfidence: "N/A",
          approxAge: c.approxAge || c.childAge || "N/A",
          photo: c.childPhoto || ""
        }));
        setAdminCases(loadedCases);
      }

      if (auditRes.status === "fulfilled" && auditRes.value.data?.auditLogs) {
        const liveLogs = auditRes.value.data.auditLogs;
        setAuditLogs(liveLogs);
        const liveActivity = liveLogs.slice(0, 10).map((log) => ({
          id: log._id || log.id,
          actor: log.actorName || log.actorRole || "System",
          role: log.actorRole || "System",
          action: log.action || "Platform Action",
          time: log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
          status: log.outcome || "Success"
        }));
        setActivityFeed(liveActivity);
      }

      const activeCount = loadedCases.filter((c) => c.status !== "Recovered").length;
      const recoveredCount = loadedCases.filter((c) => c.status === "Recovered").length;
      const verifiedOrgs = mappedUsers.filter(
        (u) => (u.rawRole === "police" || u.rawRole === "ngo") && u.verificationStatus === "Verified"
      ).length;
      const pendingCount = mappedUsers.filter((u) => u.verificationStatus === "Pending").length;

      setPlatformStats({
        totalUsers: mappedUsers.length,
        registeredChildren: loadedCases.length,
        activeMissingCases: activeCount,
        activeFoundReports: 0,
        recoveredChildren: recoveredCount,
        verifiedOrganizations: verifiedOrgs,
        pendingVerifications: pendingCount,
        systemAlertsCount: pendingCount,
        lastUpdate: "Just now"
      });
    } catch (err) {
      console.warn("Could not fetch admin datasets from backend:", err.message);
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

  // Audit Logs State (Live fetched via auditLogService)
  const [auditLogs, setAuditLogs] = useState([]);

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
