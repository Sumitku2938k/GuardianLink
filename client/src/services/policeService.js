/**
 * GuardianLink — Police Service (Phase 8)
 *
 * Dedicated API service for law enforcement operational workflows:
 * - Scoped missing case management
 * - Investigation notes & checklists
 * - Police case number & FIR persistence
 * - Human AI match verification decisions
 * - Citizen sighting review & queue
 * - Station dashboard analytics
 * - Law enforcement notification center
 */

import api from "../lib/axios.js";

/**
 * Normalizes a raw backend MissingCase into the format expected by Police UI components.
 */
export const normalizePoliceCase = (c) => {
  if (!c) return null;

  const child = (c.childId && typeof c.childId === "object") ? c.childId : (c.child && typeof c.child === "object") ? c.child : {};
  const reporter = (c.reportedBy && typeof c.reportedBy === "object") ? c.reportedBy : {};
  const rawLoc = c.lastSeen?.location || c.lastSeenLocation || (typeof c.lastSeen === "object" ? c.lastSeen : {}) || {};
  const loc = typeof rawLoc === "object" ? rawLoc : { address: String(rawLoc) };
  const locationString =
    typeof rawLoc === "string"
      ? rawLoc
      : loc.address
      ? loc.city && !loc.address.toLowerCase().includes(loc.city.toLowerCase())
        ? `${loc.address}, ${loc.city}`
        : loc.address
      : locationParts.join(", ") || loc.city || "Area Unknown";

  // Stage mapping based on status
  const stageMap = {
    reported: 1,
    under_verification: 2,
    active: 4,
    found: 6,
    reunited: 8,
    closed: 9,
    cancelled: 1
  };

  const statusCapitalized =
    c.status === "under_verification"
      ? "Under Review"
      : c.status === "active"
      ? "Investigating"
      : c.status === "found"
      ? "Found"
      : c.status === "reunited"
      ? "Reunification"
      : c.status === "closed"
      ? "Closed"
      : c.status === "cancelled"
      ? "Cancelled"
      : "New";

  const priorityCapitalized =
    c.priority === "critical"
      ? "Critical"
      : c.priority === "high"
      ? "High"
      : c.priority === "medium"
      ? "Medium"
      : "Low";

  const missingDateObj = c.missingDate ? new Date(c.missingDate) : null;
  const lastSeenDate = missingDateObj ? missingDateObj.toISOString().split("T")[0] : "";
  const lastSeenTime = missingDateObj
    ? missingDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return {
    ...c,
    id: c.id || c._id,
    caseNumber: c.caseNumber || c.policeCaseNumber || `MC-${(c.id || c._id || "").toString().slice(-6).toUpperCase()}`,
    childId: child.id || child._id || c.childId,
    childName: child.fullName || child.name || c.childName || "Unknown Child",
    childAge: child.age !== undefined && child.age !== null ? child.age : c.childAge || "--",
    childGender: child.gender ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1) : c.childGender || "Unknown",
    childPhoto: child.photos?.[0]?.url || child.photoUrl || child.photo || c.childPhoto || "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80",
    status: statusCapitalized,
    rawStatus: c.status,
    priority: priorityCapitalized,
    rawPriority: c.priority,
    stageIndex: stageMap[c.status] || 4,
    lastSeenLocation: locationString,
    locationLandmark: loc.landmark || c.locationLandmark || "Near Reported Location",
    lastSeenDate,
    lastSeenTime,
    createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recent",
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Just Now",

    assignedOfficerId: c.assignedOfficer?.id || c.assignedOfficerId || "",
    assignedOfficerName: c.assignedOfficer?.name || c.assignedOfficerName || "Unassigned",
    assignedOfficerBadge: c.assignedOfficer?.badgeNumber || c.assignedOfficerBadge || "Pending",
    stationName: c.stationName || "District Child Protection Post",
    firNumber: c.firNumber || "Pending FIR",
    firAvailable: Boolean(c.firNumber && c.firNumber !== "Pending FIR"),

    // Child Profile Details
    height: child.height || c.height || "135 cm",
    hair: child.hair || c.hair || "Dark hair",
    clothingTop: c.clothingTop || "Standard Clothing",
    clothingBottom: c.clothingBottom || "Standard Trousers",
    distinctiveMarks: child.distinctiveMarks || child.distinctiveFeatures || child.birthmarks || c.distinctiveMarks || "None reported",
    circumstances: c.lastSeenDescription || child.description || "Reported missing to law enforcement.",

    // Medical Info
    bloodGroup: child.bloodGroup || c.bloodGroup || "O+",
    medicalConditions: child.medicalConditions || c.medicalConditions || "None recorded",
    allergies: child.allergies || c.allergies || "None",
    medication: child.medications || c.medication || "None",

    // Guardian Info (Protected for law enforcement view)
    guardianName: reporter.name || c.guardianName || "Verified Guardian",
    guardianRelation: "Parent / Primary Guardian",
    guardianPhone: reporter.phone || c.guardianPhone || "+91 98110 00000",
    guardianEmail: reporter.email || c.guardianEmail || "guardian@guardianlink.local",
    guardianVerified: true,

    investigationNotes: normalizeNotes(c.investigationNotes),
    investigationTasks: normalizeTasks(c.investigationTasks),
    potentialMatchReviews: Array.isArray(c.potentialMatchReviews) ? c.potentialMatchReviews : []
  };
};

/**
 * Normalizes investigation notes array or legacy string into UI objects.
 */
export const normalizeNotes = (notes) => {
  if (!notes) return [];
  if (typeof notes === "string") {
    return [
      {
        id: "note-legacy",
        officerName: "Police Department",
        badge: "DUTY-DESK",
        text: notes,
        time: "Logged"
      }
    ];
  }
  if (Array.isArray(notes)) {
    return notes.map((n, idx) => ({
      id: (n._id || n.id || `note-${idx}`).toString(),
      officerId: n.officerId || n.officer,
      officerName: n.officerName || "Police Officer",
      badge: n.badge || "DL-POL",
      text: n.text || n.note || "",
      time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"
    }));
  }
  return [];
};

/**
 * Normalizes investigation tasks into UI checklist items.
 */
export const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t, idx) => ({
    id: (t._id || t.id || `task-${idx}`).toString(),
    label: t.label || t.task || "",
    completed: Boolean(t.completed),
    assignedTo: t.assignedTo || "Unassigned"
  }));
};

/**
 * Normalizes a Sighting report for Police queue.
 */
export const normalizePoliceSighting = (s) => {
  if (!s) return null;

  const loc = s.location || {};
  const appearance = s.appearance || s.childDetails || {};
  const locationParts = [loc.landmark, loc.address, loc.city, loc.state].filter(Boolean);
  const locationString = locationParts.join(", ") || loc.description || loc.city || "Coordinates Recorded";

  const coords = loc.coordinates?.coordinates || s.coordinates?.coordinates || null;
  const lat = Array.isArray(coords) ? coords[1] : (s.coordinates?.lat || s.latitude || null);
  const lng = Array.isArray(coords) ? coords[0] : (s.coordinates?.lng || s.longitude || null);

  const reportId = (s.id || s._id || "").toString();

  return {
    ...s,
    id: reportId,
    reportNumber: s.reportNumber || s.sightingNumber || `CR-${reportId.slice(-6).toUpperCase()}`,
    date: s.observedAt || s.createdAt ? new Date(s.observedAt || s.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recent",
    location: locationString,
    coordinates: lat != null && lng != null ? { lat, lng } : null,
    photo: s.photos?.[0]?.url || s.photoUrl || s.photo || null,
    approxAge: appearance.approximateAge || appearance.estimatedAge || appearance.approxAge || "Unknown",
    clothing: appearance.clothingDescription || appearance.clothing || "Standard Attire",
    safetyState: s.isChildSafe ? "Safe / Non-Critical" : "Needs Immediate Check",
    status: s.status || "under_review",
    reviewNotes: s.reviewNotes || "",
    matchedCaseId: s.caseId?._id || s.caseId?.id || s.caseId || null,
    matchedChildName: s.childId?.fullName || (typeof s.caseId === "object" ? s.caseId?.caseNumber : null) || null
  };
};

export const normalizeCase = normalizePoliceCase;
export const normalizeSighting = normalizePoliceSighting;

/**
 * Fetch authorized operational missing cases.
 */
export const getPoliceCases = async (params = {}) => {
  const response = await api.get("/api/cases", { params });
  const rawCases = response.data?.cases || [];
  return {
    cases: rawCases.map(normalizePoliceCase),
    count: response.data?.count || rawCases.length
  };
};

/**
 * Fetch detailed record for a specific missing case.
 */
export const getPoliceCaseById = async (caseId) => {
  const response = await api.get(`/api/cases/${caseId}`);
  const rawCase = response.data?.case;
  return {
    case: normalizePoliceCase(rawCase)
  };
};

/**
 * Fetch scoped station dashboard aggregated metrics.
 */
export const getPoliceDashboardStats = async () => {
  const response = await api.get("/api/cases/police/dashboard-stats");
  return response.data?.stats || {};
};

/**
 * Update case lifecycle status (Controlled state machine).
 */
export const updateCaseStatus = async (caseId, status) => {
  const response = await api.patch(`/api/cases/${caseId}/status`, { status });
  return {
    case: normalizePoliceCase(response.data?.case),
    message: response.data?.message
  };
};

/**
 * Update police case number, FIR number, or priority.
 */
export const updateInvestigationDetails = async (caseId, details) => {
  const response = await api.patch(`/api/cases/${caseId}/investigation`, details);
  return {
    case: normalizePoliceCase(response.data?.case),
    message: response.data?.message
  };
};

/**
 * Assign or reassign officer squad lead.
 */
export const assignOfficer = async (caseId, assignmentData) => {
  const response = await api.patch(`/api/cases/${caseId}/assign`, assignmentData);
  return {
    case: normalizePoliceCase(response.data?.case),
    message: response.data?.message
  };
};

/**
 * Add an append-only internal police investigation note.
 */
export const addInvestigationNote = async (caseId, text) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Note text is required and cannot be empty.");
  }
  const response = await api.post(`/api/cases/${caseId}/notes`, { text: text.trim() });
  return {
    case: normalizePoliceCase(response.data?.case),
    notes: response.data?.notes || [],
    message: response.data?.message
  };
};

/**
 * Create an investigation checklist action item.
 */
export const createTask = async (caseId, taskData) => {
  const response = await api.post(`/api/cases/${caseId}/tasks`, taskData);
  return {
    case: normalizePoliceCase(response.data?.case),
    tasks: response.data?.tasks || [],
    message: response.data?.message
  };
};

/**
 * Toggle completion of an investigation task.
 */
export const toggleTask = async (caseId, taskId) => {
  const response = await api.patch(`/api/cases/${caseId}/tasks/${taskId}`);
  return {
    case: normalizePoliceCase(response.data?.case),
    tasks: response.data?.tasks || [],
    message: response.data?.message
  };
};

/**
 * Submit official officer human decision on an AI potential match lead.
 */
export const reviewAIMatch = async (caseId, matchId, reviewData = {}) => {
  const { decision } = reviewData;
  if (!decision || !["confirm", "reject", "request_evidence"].includes(decision)) {
    throw new Error("Invalid verification decision. Must be confirm, reject, or request_evidence.");
  }
  const response = await api.post(`/api/cases/${caseId}/matches/${matchId}/review`, reviewData);
  return {
    case: normalizePoliceCase(response.data?.case),
    message: response.data?.message
  };
};

/**
 * Fetch citizen sighting reports queue for police verification desk.
 */
export const getPoliceSightings = async (params = {}) => {
  const response = await api.get("/api/sightings", { params });
  const rawSightings = response.data?.sightings || [];
  return {
    sightings: rawSightings.map(normalizePoliceSighting),
    count: response.data?.count || rawSightings.length
  };
};

/**
 * Fetch all sightings for a specific case.
 */
export const getCaseSightings = async (caseId) => {
  const response = await api.get(`/api/sightings/case/${caseId}`);
  const rawSightings = response.data?.sightings || [];
  return {
    sightings: rawSightings.map(normalizePoliceSighting),
    count: response.data?.count || rawSightings.length
  };
};

/**
 * Review citizen sighting report (verify, dismiss, under_review).
 */
export const reviewSighting = async (sightingId, reviewData = {}) => {
  const { status } = reviewData;
  if (!status || !["verified", "dismissed", "under_review"].includes(status)) {
    throw new Error("Invalid sighting review status. Must be verified, dismissed, or under_review.");
  }
  const response = await api.patch(`/api/sightings/${sightingId}/review`, reviewData);
  return {
    sighting: normalizePoliceSighting(response.data?.sighting),
    message: response.data?.message
  };
};

/**
 * Fetch persistent police in-app notifications.
 */
export const getPoliceNotifications = async () => {
  const response = await api.get("/api/notifications");
  return {
    notifications: response.data?.notifications || [],
    unreadCount: response.data?.unreadCount || 0
  };
};

/**
 * Mark a notification as read.
 */
export const markNotificationRead = async (notificationId) => {
  const response = await api.patch(`/api/notifications/${notificationId}/read`);
  return response.data?.notification;
};
