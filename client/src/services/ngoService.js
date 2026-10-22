/**
 * GuardianLink — NGO Service (Phase 9)
 *
 * Frontend API client communicating with backend NGO operational routes:
 * - Scoped dashboard statistics
 * - Authorized case referrals
 * - Persistent CareRecords (intake, notes, medical updates)
 * - Concurrency-safe shelter capacity and placements
 * - Police-coordinated handover review and safe release
 */

import api from "../lib/axios.js";

/**
 * Normalizes a raw backend CareRecord into the shape expected by existing NGO UI components.
 */
export const normalizeCareRecord = (r) => {
  if (!r) return null;

  const child = r.childId && typeof r.childId === "object" ? r.childId : {};
  const missingCase = r.caseId && typeof r.caseId === "object" ? r.caseId : {};
  const shelter = r.shelterId && typeof r.shelterId === "object" ? r.shelterId : {};
  const police = r.policeCoordination || {};
  const initial = r.initialCondition || {};
  const provisions = r.provisions || {};

  // Status mapping
  const statusBadgeMap = {
    pending_intake: "Newly Received",
    in_care: "Stable",
    awaiting_handover: "Awaiting Verification",
    handed_over: "Released",
    closed: "Released"
  };

  const medicalBadgeMap = {
    stable: "Stable",
    monitoring: "Monitoring",
    attention_required: "Medical Attention Required",
    emergency: "Emergency"
  };

  const id = (r._id || r.id || "").toString();
  const caseIdString = (missingCase._id || r.caseId || "").toString();
  const childName = child.fullName || child.name || r.childReference || "Child";
  const caseNum = missingCase.caseNumber || (caseIdString ? `MC-${caseIdString.slice(-6).toUpperCase()}` : (r.caseNumber || "Case"));

  // Calculate elapsed time in shelter
  let timeInShelter = "Just Received";
  if (r.receivedAt) {
    const diffMs = Date.now() - new Date(r.receivedAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 1) {
      timeInShelter = `${diffDays} day${diffDays > 1 ? "s" : ""} in care`;
    } else {
      timeInShelter = `${Math.max(1, diffHours)} hour${diffHours > 1 ? "s" : ""} in care`;
    }
  }

  // Fallback photo
  const defaultPhoto = "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&auto=format&fit=crop&q=80";
  const photo = child.photoUrl || child.photo || (child.photos && child.photos[0]?.url) || r.photo || defaultPhoto;

  return {
    _id: id,
    id,
    careRecordId: id,
    caseId: caseIdString,
    childId: (child._id || r.childId || "").toString(),
    childReference: childName,
    caseNumber: caseNum,
    intakeId: r.intakeNumber || `IN-${id.slice(-4).toUpperCase()}`,
    approxAge: child.age || r.approxAge || 7,
    gender: child.gender ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1) : (r.gender || "Child"),
    photo,
    receivedDate: r.receivedAt ? new Date(r.receivedAt).toLocaleString() : new Date().toLocaleString(),
    timeInShelter,
    careStatus: statusBadgeMap[r.status] || r.careStatus || "Stable",
    rawStatus: r.status || "in_care",
    medicalStatus: medicalBadgeMap[r.medicalStatus] || r.medicalStatus || "Stable",
    rawMedicalStatus: r.medicalStatus || "stable",
    safetyState: r.status === "handed_over" || r.status === "closed"
      ? "Safely Reunited"
      : r.status === "awaiting_handover"
      ? "Awaiting Verification"
      : `Safe in ${r.assignedDorm || "Shelter Dormitory"}`,
    assignedDorm: r.assignedDorm || (shelter.name ? `${shelter.name} - Dorm 1` : "Main Dormitory"),
    guardianVerificationStatus: r.status === "awaiting_handover"
      ? "Desk Verification in Progress"
      : r.status === "handed_over"
      ? "Guardian Located & Verified"
      : "Searching Records",
    policeStation: police.policeStation || "Central Police Post",
    assignedOfficer: police.assignedOfficer || missingCase.assignedOfficer?.name || "Assigned Officer",
    intakeSource: initial.intakeSource || "Citizen / Police Escort",

    // Provisions & wellbeing
    foodProvided: provisions.foodProvided ?? true,
    waterProvided: provisions.waterProvided ?? true,
    clothingProvided: provisions.clothingProvided ?? true,
    restingAreaProvided: provisions.restingAreaProvided ?? true,
    emotionalState: initial.emotionalState || "Calm",
    visibleInjuries: initial.visibleInjuries || "None observed",
    careNotes: r.careNotes && r.careNotes.length > 0 ? r.careNotes[0].text : (r.initialCondition?.immediateNeeds || "Intake complete."),
    allCareNotes: Array.isArray(r.careNotes) ? r.careNotes : [],
    shelterId: shelter._id || r.shelterId || null,
    shelterName: shelter.name || "Default Shelter Kiosk",
    handoverId: r.handoverId || null
  };
};

/**
 * Normalizes shelter record.
 */
export const normalizeShelter = (s) => {
  if (!s) return null;
  const cap = Number(s.capacity) || 10;
  const occ = Number(s.activePlacements) || 0;
  const avail = Math.max(0, cap - occ);
  const occupancyPercentage = Math.min(100, Math.round((occ / cap) * 100));

  return {
    _id: (s._id || s.id || "").toString(),
    id: (s._id || s.id || "").toString(),
    name: s.name || "Main Shelter",
    address: typeof s.address === "object" ? `${s.address.address || ""}, ${s.address.city || ""}` : (s.address || "Community Center"),
    totalCapacity: cap,
    occupied: occ,
    available: avail,
    occupancyPercentage,
    status: s.status || "active",
    staffCount: s.staffCount || 1,
    facilities: Array.isArray(s.facilities) && s.facilities.length > 0
      ? s.facilities
      : [
          { name: "Emergency Medical Care Room", status: "Operational" },
          { name: "Child Resting & Sleeping Dormitory", status: "Operational" },
          { name: "Nutrition & Food Kitchen Kiosk", status: "Operational" },
          { name: "Child Counseling Room", status: "Active Staffed" }
        ],
    contactPhone: s.contactPhone || "+91 11 2617 2000",
    contactEmail: s.contactEmail || "shelter@guardianlink.org"
  };
};

/**
 * Normalizes handover or transfer object into transfers list format.
 */
export const normalizeTransfer = (h) => {
  if (!h) return null;
  const care = h.careRecordId && typeof h.careRecordId === "object" ? h.careRecordId : {};
  const child = h.childId && typeof h.childId === "object" ? h.childId : {};
  const missingCase = h.caseId && typeof h.caseId === "object" ? h.caseId : {};

  const id = (h._id || h.id || "").toString();
  const childRef = child.fullName || child.name || (care.childReference || "Child");
  const caseNum = missingCase.caseNumber || (missingCase._id ? `MC-${missingCase._id.toString().slice(-6).toUpperCase()}` : "Case");

  const statusLabel =
    h.status === "completed"
      ? "Completed"
      : h.status === "approved"
      ? "Approved"
      : h.status === "rejected"
      ? "Rejected"
      : "Scheduled";

  return {
    _id: id,
    id: `TR-${id.slice(-6).toUpperCase()}`,
    handoverId: id,
    careRecordId: (care._id || h.careRecordId || "").toString(),
    childReference: `${childRef} (Case #${caseNum})`,
    fromFacility: "NGO Temporary Care Shelter",
    toFacility: h.handoverType === "medical_facility"
      ? "City Children's Hospital"
      : h.handoverType === "police_custody"
      ? (h.receivingOfficer?.station || "Police Station Desk")
      : (h.guardianDetails?.name ? `Verified Guardian (${h.guardianDetails.name})` : "Verified Family Reunification"),
    reason: h.handoverType === "guardian_reunification"
      ? "Authorized Family Reunification"
      : h.handoverType === "medical_facility"
      ? "Specialized Pediatric Care"
      : "Police Protective Custody Transfer",
    scheduledTime: h.requestedAt ? new Date(h.requestedAt).toLocaleString() : "Recent",
    status: statusLabel,
    rawStatus: h.status || "pending",
    responsibleStaff: h.receivingOfficer?.name ? `Officer ${h.receivingOfficer.name}` : "NGO Supervisor",
    notes: h.handoverNotes || "",
    guardianName: h.guardianDetails?.name || "",
    guardianRelation: h.guardianDetails?.relationship || "Legal Guardian",
    guardianVerified: Boolean(h.guardianDetails?.verifiedByPolice)
  };
};

// ----------------- API Methods -----------------

export const getNgoDashboardStats = async () => {
  const response = await api.get("/api/ngo/dashboard-stats");
  return response.data;
};

export const getNgoReferrals = async () => {
  const response = await api.get("/api/ngo/referrals");
  return response.data;
};

export const getNgoCareRecords = async (params = {}) => {
  const response = await api.get("/api/ngo/care-records", { params });
  return response.data;
};

export const getNgoCareRecordById = async (careRecordId) => {
  const response = await api.get(`/api/ngo/care-records/${careRecordId}`);
  return response.data;
};

export const createNgoIntake = async (intakeData) => {
  const response = await api.post("/api/ngo/care-records", intakeData);
  return response.data;
};

export const updateCareRecordStatus = async (careRecordId, status, reason = "") => {
  const response = await api.patch(`/api/ngo/care-records/${careRecordId}/status`, { status, reason });
  return response.data;
};

export const addCareNote = async (careRecordId, { text, category }) => {
  const response = await api.post(`/api/ngo/care-records/${careRecordId}/notes`, { text, category });
  return response.data;
};

export const updateMedicalStatus = async (careRecordId, medicalStatus) => {
  const response = await api.patch(`/api/ngo/care-records/${careRecordId}/medical-status`, { medicalStatus });
  return response.data;
};

export const assignPlacement = async (careRecordId, { shelterId, assignedDorm }) => {
  const response = await api.post(`/api/ngo/care-records/${careRecordId}/placement`, { shelterId, assignedDorm });
  return response.data;
};

export const getNgoShelters = async () => {
  const response = await api.get("/api/ngo/shelters");
  return response.data;
};

export const createShelter = async (shelterData) => {
  const response = await api.post("/api/ngo/shelters", shelterData);
  return response.data;
};

export const updateShelter = async (shelterId, shelterData) => {
  const response = await api.patch(`/api/ngo/shelters/${shelterId}`, shelterData);
  return response.data;
};

export const requestHandover = async (careRecordId, handoverData) => {
  const response = await api.post(`/api/ngo/care-records/${careRecordId}/handovers`, handoverData);
  return response.data;
};

export const getHandovers = async (params = {}) => {
  const response = await api.get("/api/ngo/handovers", { params });
  return response.data;
};

export const getHandoverById = async (handoverId) => {
  const response = await api.get(`/api/ngo/handovers/${handoverId}`);
  return response.data;
};

export const approveHandover = async (handoverId) => {
  const response = await api.patch(`/api/ngo/handovers/${handoverId}/approve`);
  return response.data;
};

export const rejectHandover = async (handoverId, reason) => {
  const response = await api.patch(`/api/ngo/handovers/${handoverId}/reject`, { reason });
  return response.data;
};

export const completeHandover = async (handoverId, details = {}) => {
  const response = await api.patch(`/api/ngo/handovers/${handoverId}/complete`, details);
  return response.data;
};
