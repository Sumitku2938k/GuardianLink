/**
 * GuardianLink — Sighting Service (Phase 7)
 *
 * Implements server-side sighting submission, validation, and authorized workflows:
 * 1. Revalidates MissingCase eligibility at submission time (fail-closed).
 * 2. Derives childId directly from the authoritative MissingCase (never trusts client childId).
 * 3. Enforces mandatory citizen safety confirmation (safetyConfirmed === true).
 * 4. Validates optional geographic coordinates and location bounds.
 * 5. Persists report in MongoDB and triggers authorized notifications.
 * 6. Ensures privacy: Zero guardian PII is ever returned to citizen.
 */

const mongoose = require("mongoose");
const Sighting = require("../models/Sighting");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const notificationService = require("./notificationService");
const { ELIGIBLE_CASE_STATUSES } = require("./citizenPhotoSearchService");

/**
 * Creates and persists a citizen sighting report.
 *
 * @param {Object} params
 * @param {string} params.caseId - Referenced MissingCase ObjectId
 * @param {string} params.description - Observation notes
 * @param {boolean} params.safetyConfirmed - Mandatory user safety acknowledgment
 * @param {Object} [params.location] - Sighting address, city, state, coords
 * @param {Object} [params.appearance] - Child clothing, age, gender details
 * @param {string} [params.safetyState] - Observed safety state
 * @param {Date|string} [params.observedAt] - Observation time
 * @param {Object} params.reportingUser - Authenticated user from session/token
 * @returns {Promise<{ sighting: Object, notifications: Object }>}
 */
const submitSighting = async (params) => {
  const {
    caseId,
    description,
    safetyConfirmed,
    location = {},
    appearance = {},
    safetyState = "Safe",
    observedAt,
    reportingUser
  } = params;

  // 1. Authenticated user validation
  if (!reportingUser || !reportingUser._id) {
    const error = new Error("Authentication required to submit a sighting report.");
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  // 2. Case identifier validation
  if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
    const error = new Error("A valid active case reference is required to report a sighting.");
    error.status = 400;
    error.code = "INVALID_CASE_ID";
    throw error;
  }

  // 3. Mandatory Safety Confirmation validation
  if (safetyConfirmed !== true && safetyConfirmed !== "true") {
    const error = new Error(
      "You must explicitly confirm the safety instructions (no confrontation or physical intervention) before submitting."
    );
    error.status = 400;
    error.code = "SAFETY_CONFIRMATION_REQUIRED";
    throw error;
  }

  // 4. Description validation
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    const error = new Error("Observation details must be provided.");
    error.status = 400;
    error.code = "MISSING_DESCRIPTION";
    throw error;
  }

  if (description.trim().length > 2000) {
    const error = new Error("Observation description cannot exceed 2000 characters.");
    error.status = 400;
    error.code = "DESCRIPTION_TOO_LONG";
    throw error;
  }

  // 5. Geographic coordinates validation (if provided)
  let parsedLat = undefined;
  let parsedLng = undefined;

  if (location.latitude !== undefined && location.latitude !== null && location.latitude !== "") {
    const lat = Number(location.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      const error = new Error("Latitude must be a valid number between -90 and 90.");
      error.status = 400;
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    parsedLat = lat;
  }

  if (location.longitude !== undefined && location.longitude !== null && location.longitude !== "") {
    const lng = Number(location.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      const error = new Error("Longitude must be a valid number between -180 and 180.");
      error.status = 400;
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    parsedLng = lng;
  }

  // 6. Observation timestamp validation
  let parsedObservedAt = new Date();
  if (observedAt) {
    const d = new Date(observedAt);
    if (isNaN(d.getTime())) {
      const error = new Error("Observation date must be a valid ISO date string.");
      error.status = 400;
      error.code = "INVALID_OBSERVATION_DATE";
      throw error;
    }
    // Allow up to 5 minutes clock drift into future
    const fiveMinsFuture = new Date(Date.now() + 5 * 60 * 1000);
    if (d > fiveMinsFuture) {
      const error = new Error("Observation date cannot be in the future.");
      error.status = 400;
      error.code = "FUTURE_OBSERVATION_DATE";
      throw error;
    }
    parsedObservedAt = d;
  }

  // 7. Authoritative MissingCase lookup & Eligibility Re-validation
  const missingCase = await MissingCase.findById(caseId);
  if (!missingCase) {
    const error = new Error("The referenced missing case does not exist.");
    error.status = 404;
    error.code = "CASE_NOT_FOUND";
    throw error;
  }

  // Case Status Eligibility Check: ONLY active, reported, or under_verification are eligible
  if (!ELIGIBLE_CASE_STATUSES.includes(missingCase.status)) {
    const error = new Error(
      `Sighting reports cannot be filed against case #${missingCase.caseNumber} because its status is '${missingCase.status}'. Sighting submission is only permitted for active investigations.`
    );
    error.status = 409;
    error.code = "CASE_NOT_ELIGIBLE";
    throw error;
  }

  // 8. Resolve authoritative Child from MissingCase
  const child = await Child.findById(missingCase.childId);
  if (!child || child.status !== "active") {
    const error = new Error("The child associated with this case is inactive or no longer on record.");
    error.status = 409;
    error.code = "CHILD_NOT_ELIGIBLE";
    throw error;
  }

  // 9. Construct sanitized Sighting document (Anti-Mass-Assignment)
  const sighting = new Sighting({
    caseId: missingCase._id,
    childId: child._id, // Authoritative resolution from DB
    reportedBy: reportingUser._id, // Strict session derivation
    observedAt: parsedObservedAt,
    location: {
      address: location.address ? String(location.address).trim().slice(0, 500) : "",
      city: location.city ? String(location.city).trim().slice(0, 100) : "",
      state: location.state ? String(location.state).trim().slice(0, 100) : "",
      landmark: location.landmark ? String(location.landmark).trim().slice(0, 200) : "",
      pinCode: location.pinCode ? String(location.pinCode).trim().slice(0, 20) : "",
      latitude: parsedLat,
      longitude: parsedLng
    },
    description: description.trim(),
    appearance: {
      approxAge: appearance.approxAge ? String(appearance.approxAge).trim().slice(0, 50) : "",
      approxGender: appearance.approxGender ? String(appearance.approxGender).trim().slice(0, 50) : "",
      clothing: appearance.clothing ? String(appearance.clothing).trim().slice(0, 500) : "",
      distinctiveFeatures: appearance.distinctiveFeatures ? String(appearance.distinctiveFeatures).trim().slice(0, 500) : ""
    },
    safetyState: safetyState ? String(safetyState).trim().slice(0, 200) : "Safe",
    safetyConfirmed: true,
    status: "submitted"
  });

  await sighting.save();

  // 10. Dispatch Authorized Notifications (Law Enforcement & Verified Guardian)
  let notificationOutcome = { policeNotified: 0, guardianNotified: false };
  try {
    notificationOutcome = await notificationService.notifyAuthorizedRespondersForSighting({
      sighting,
      missingCase,
      child
    });
  } catch (notifErr) {
    // Sighting is safely persisted; record notification error for monitoring
    console.error(`[SightingService] Notification dispatch error for sighting ${sighting._id}:`, notifErr.message);
  }

  // 11. Format Privacy-Safe Output for the Reporter
  const safeSighting = sighting.toSafeObject({ isReporter: true });

  return {
    sighting: safeSighting,
    notifications: notificationOutcome,
    message: "Sighting report registered successfully and dispatched to authorized responders."
  };
};

/**
 * Retrieves sighting reports submitted by the authenticated citizen.
 *
 * @param {string|ObjectId} userId
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
const getMySightings = async (userId, options = {}) => {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);

  const sightings = await Sighting.find({ reportedBy: userId })
    .populate("caseId", "caseNumber status priority missingDate")
    .populate("childId", "fullName photoUrl age gender")
    .sort({ createdAt: -1 })
    .limit(limit);

  return sightings.map((s) => s.toSafeObject({ isReporter: true }));
};

/**
 * Retrieves a single sighting report by ID with strict authorization enforcement.
 *
 * @param {string|ObjectId} sightingId
 * @param {Object} requestingUser
 * @returns {Promise<Object>}
 */
const getSightingById = async (sightingId, requestingUser) => {
  if (!sightingId || !mongoose.Types.ObjectId.isValid(sightingId)) {
    const error = new Error("Invalid sighting report ID format.");
    error.status = 400;
    error.code = "INVALID_SIGHTING_ID";
    throw error;
  }

  const sighting = await Sighting.findById(sightingId)
    .populate("caseId", "caseNumber status priority lastSeenLocation reportedBy")
    .populate("childId", "fullName photoUrl age gender guardianId");

  if (!sighting) {
    const error = new Error("Sighting report not found.");
    error.status = 404;
    error.code = "SIGHTING_NOT_FOUND";
    throw error;
  }

  const userIdStr = requestingUser._id.toString();
  const isReporter = sighting.reportedBy.toString() === userIdStr;
  const isAuthorizedResponder = ["police", "admin", "ngo"].includes(requestingUser.role);
  const isCaseGuardian =
    (sighting.childId && sighting.childId.guardianId && sighting.childId.guardianId.toString() === userIdStr) ||
    (sighting.caseId && sighting.caseId.reportedBy && sighting.caseId.reportedBy.toString() === userIdStr);

  if (!isReporter && !isAuthorizedResponder && !isCaseGuardian) {
    const error = new Error("Access denied. You are not authorized to view this sighting report.");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  return sighting.toSafeObject({
    isReporter,
    isAuthorizedResponder
  });
};

/**
 * Updates review status of a sighting report (Police / Admin desk only).
 *
 * @param {string|ObjectId} sightingId
 * @param {Object} params
 * @param {string} params.status - "under_review", "verified", or "dismissed"
 * @param {string} [params.reviewNotes]
 * @param {Object} reviewingUser
 * @returns {Promise<Object>}
 */
const reviewSighting = async (sightingId, params, reviewingUser) => {
  if (!sightingId || !mongoose.Types.ObjectId.isValid(sightingId)) {
    const error = new Error("Invalid sighting report ID.");
    error.status = 400;
    error.code = "INVALID_SIGHTING_ID";
    throw error;
  }

  const validStatuses = ["under_review", "verified", "dismissed"];
  if (!params.status || !validStatuses.includes(params.status)) {
    const error = new Error("Review status must be one of: under_review, verified, dismissed.");
    error.status = 400;
    error.code = "INVALID_REVIEW_STATUS";
    throw error;
  }

  const sighting = await Sighting.findById(sightingId);
  if (!sighting) {
    const error = new Error("Sighting report not found.");
    error.status = 404;
    error.code = "SIGHTING_NOT_FOUND";
    throw error;
  }

  sighting.status = params.status;
  sighting.reviewedBy = reviewingUser._id;
  sighting.reviewedAt = new Date();
  if (params.reviewNotes) {
    sighting.reviewNotes = String(params.reviewNotes).trim().slice(0, 1000);
  }

  await sighting.save();

  // Notify the reporting citizen of status review update
  try {
    await notificationService.createNotification({
      recipientId: sighting.reportedBy,
      senderId: reviewingUser._id,
      recipientRole: "citizen",
      type: "sighting_reviewed",
      title: `Update on Sighting #${sighting.reportNumber}`,
      message: `Your sighting report #${sighting.reportNumber} status was updated to '${params.status}' by law enforcement officers.`,
      data: {
        sightingId: sighting._id,
        reportNumber: sighting.reportNumber,
        newStatus: params.status
      }
    });
  } catch (notifErr) {
    console.error("[SightingService] Reporter notification error on review:", notifErr.message);
  }

  return sighting.toSafeObject({ isAuthorizedResponder: true });
};

/**
 * Retrieves all sightings associated with an active case (Police / Admin / Guardian only).
 *
 * @param {string|ObjectId} caseId
 * @param {Object} requestingUser
 * @returns {Promise<Array<Object>>}
 */
const getCaseSightings = async (caseId, requestingUser) => {
  if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
    const error = new Error("Invalid case reference ID.");
    error.status = 400;
    error.code = "INVALID_CASE_ID";
    throw error;
  }

  const missingCase = await MissingCase.findById(caseId);
  if (!missingCase) {
    const error = new Error("Missing case not found.");
    error.status = 404;
    error.code = "CASE_NOT_FOUND";
    throw error;
  }

  const userIdStr = requestingUser._id.toString();
  const isCaseGuardian = missingCase.reportedBy.toString() === userIdStr;
  const isAuthorizedResponder = ["police", "admin", "ngo"].includes(requestingUser.role);

  if (!isCaseGuardian && !isAuthorizedResponder) {
    const error = new Error("Access denied. You are not authorized to view sightings for this case.");
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const sightings = await Sighting.find({ caseId })
    .populate("reportedBy", "name")
    .sort({ createdAt: -1 });

  return sightings.map((s) =>
    s.toSafeObject({
      isAuthorizedResponder,
      isReporter: s.reportedBy?._id?.toString() === userIdStr
    })
  );
};

module.exports = {
  submitSighting,
  getMySightings,
  getSightingById,
  reviewSighting,
  getCaseSightings
};
