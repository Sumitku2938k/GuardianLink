/**
 * GuardianLink — FIR Service (Phase 18)
 *
 * Implements core business logic, document security validation,
 * private storage management, police verification workflow,
 * and immutable audit logging for the FIR module.
 */

const mongoose = require("mongoose");
const FIR = require("../models/FIR");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const User = require("../models/User");
const documentSecurityValidator = require("../utils/documentSecurityValidator");
const documentStorageService = require("./documentStorageService");
const auditLogService = require("./auditLogService");
const notificationService = require("./notificationService");

class FIRServiceError extends Error {
  constructor(message, statusCode = 400, code = "FIR_ERROR") {
    super(message);
    this.name = "FIRServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Notify police officers about a new or resubmitted FIR
 */
async function notifyPoliceResponders({ fir, missingCase, child, isResubmission = false }) {
  try {
    const recipients = [];

    // Prioritize assigned officer if exists
    if (missingCase?.assignedOfficer?.id && mongoose.Types.ObjectId.isValid(missingCase.assignedOfficer.id)) {
      recipients.push(missingCase.assignedOfficer.id);
    }

    // Resolve up to 10 active police officers
    const officers = await User.find({
      role: { $in: ["police", "admin"] },
      isActive: true,
      status: { $in: ["active", "approved"] }
    }).limit(10);

    officers.forEach((o) => {
      if (!recipients.some((r) => r.toString() === o._id.toString())) {
        recipients.push(o._id);
      }
    });

    const notifType = isResubmission ? "fir_resubmitted" : "fir_submitted";
    const title = isResubmission
      ? `FIR Resubmitted for Review: Case #${missingCase.caseNumber || fir.missingCaseId}`
      : `New FIR Submitted for Verification: ${fir.firNumber}`;
    const message = isResubmission
      ? `An updated FIR document has been uploaded for Case #${missingCase.caseNumber || ""}. Pending police review.`
      : `FIR ${fir.firNumber} from ${fir.policeStation} has been filed for ${child?.fullName || "Missing Child"}. Pending police verification.`;

    for (const recipientId of recipients) {
      try {
        await notificationService.createNotification({
          recipientId,
          senderId: fir.submittedBy,
          recipientRole: "police",
          type: notifType,
          title,
          message,
          data: {
            caseId: fir.missingCaseId,
            childId: fir.childId,
            firId: fir._id,
            firNumber: fir.firNumber,
            caseNumber: missingCase.caseNumber || ""
          }
        });
      } catch (notifErr) {
        console.warn(`[FIRService] Police notification warning for ${recipientId}:`, notifErr.message);
      }
    }
  } catch (err) {
    console.warn("[FIRService] Responder notification failure:", err.message);
  }
}

/**
 * Notify parent when FIR status changes (verified/rejected)
 */
async function notifyParentOnStatusChange({ fir, action, officerUser, notes, rejectionReason = null }) {
  try {
    const isVerified = action === "verified";
    const notifType = isVerified ? "fir_verified" : "fir_rejected";
    const title = isVerified
      ? `FIR Verified by Police (${fir.firNumber})`
      : `FIR Verification Required (${fir.firNumber})`;
    const message = isVerified
      ? `Your FIR ${fir.firNumber} has been verified by Officer ${officerUser.name || "In-Charge"}. Review notes: "${notes || "Verified"}".`
      : `Your FIR document for ${fir.firNumber} was rejected. Reason: ${rejectionReason || "Details inconsistent"}. Notes: "${notes}". Please upload a corrected copy.`;

    await notificationService.createNotification({
      recipientId: fir.submittedBy,
      senderId: officerUser._id,
      recipientRole: "parent",
      type: notifType,
      title,
      message,
      data: {
        caseId: fir.missingCaseId,
        childId: fir.childId,
        firId: fir._id,
        firNumber: fir.firNumber
      }
    });
  } catch (err) {
    console.warn("[FIRService] Parent notification failure:", err.message);
  }
}

/**
 * 1. Submit an initial FIR with document upload
 */
async function createFIR({ caseId, firData, fileBuffer, fileMeta, user, req = null }) {
  if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
    throw new FIRServiceError("Invalid missing case ID", 400, "INVALID_CASE_ID");
  }

  // 1. Fetch missing case
  const missingCase = await MissingCase.findById(caseId);
  if (!missingCase) {
    throw new FIRServiceError("Missing case not found", 404, "CASE_NOT_FOUND");
  }

  // 2. Authorization check: user must be the reporting parent or admin
  const isOwner = user && user._id && String(missingCase.reportedBy) === String(user._id);
  const isAdmin = user && user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new FIRServiceError(
      "Access denied: You are not authorized to submit an FIR for this case",
      403,
      "UNAUTHORIZED_SUBMISSION"
    );
  }

  // 3. Check if verified FIR already exists for this case
  const existingFIR = await FIR.findOne({ missingCaseId: caseId });
  if (existingFIR && existingFIR.status === "verified") {
    throw new FIRServiceError(
      "An officially verified FIR already exists for this case",
      400,
      "FIR_ALREADY_VERIFIED"
    );
  }
  if (existingFIR && existingFIR.status === "pending_review") {
    throw new FIRServiceError(
      "An FIR submission is already pending review for this case. Use document replacement if you need to update it.",
      400,
      "FIR_ALREADY_PENDING"
    );
  }

  // 4. Station-scoped FIR number uniqueness
  const cleanFIRNumber = (firData.firNumber || "").trim().toUpperCase();
  const cleanPoliceStation = (firData.policeStation || "").trim();

  if (!cleanFIRNumber || !cleanPoliceStation) {
    throw new FIRServiceError("FIR Number and Police Station are required fields", 400, "MISSING_REQUIRED_FIELDS");
  }

  const duplicate = await FIR.findOne({
    policeStation: cleanPoliceStation,
    firNumber: cleanFIRNumber
  });
  if (duplicate && String(duplicate.missingCaseId) !== String(caseId)) {
    throw new FIRServiceError(
      `An FIR with number "${cleanFIRNumber}" is already registered for "${cleanPoliceStation}"`,
      409,
      "DUPLICATE_FIR_NUMBER"
    );
  }

  // 5. Binary document validation
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new FIRServiceError("Official FIR document file is required", 400, "FILE_REQUIRED");
  }

  const validationResult = documentSecurityValidator.validateDocument(
    fileBuffer,
    fileMeta.originalname,
    fileMeta.mimetype
  );

  // 6. Save document to private storage
  const storageKey = documentStorageService.generateStorageKey(caseId, 1, validationResult.extension);
  await documentStorageService.saveDocument(fileBuffer, storageKey);

  const documentRecord = {
    version: 1,
    originalFilename: validationResult.originalFilename,
    storageKey,
    fileExtension: validationResult.extension,
    mimeType: validationResult.detectedMimeType,
    fileSizeBytes: validationResult.sizeBytes,
    sha256Checksum: validationResult.sha256Checksum,
    uploadedAt: new Date(),
    uploadedBy: user._id,
    isActive: true,
    replacementReason: null
  };

  // 7. Persist or update FIR record
  let firRecord = existingFIR;
  if (!firRecord) {
    firRecord = new FIR({
      missingCaseId: caseId,
      childId: missingCase.childId,
      submittedBy: user._id,
      firNumber: cleanFIRNumber,
      policeStation: cleanPoliceStation,
      district: (firData.district || "").trim(),
      state: (firData.state || "").trim(),
      filingDate: new Date(firData.filingDate || Date.now()),
      incidentDate: firData.incidentDate ? new Date(firData.incidentDate) : null,
      sections: Array.isArray(firData.sections)
        ? firData.sections
        : typeof firData.sections === "string"
        ? firData.sections.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      complainantName: (firData.complainantName || user.name || "").trim(),
      relationship: (firData.relationship || "Parent").trim(),
      contactPhone: (firData.contactPhone || user.phone || "").trim(),
      status: "pending_review",
      documents: [documentRecord],
      verificationHistory: []
    });
  } else {
    // Re-submission of rejected case
    firRecord.firNumber = cleanFIRNumber;
    firRecord.policeStation = cleanPoliceStation;
    firRecord.district = (firData.district || firRecord.district || "").trim();
    firRecord.state = (firData.state || firRecord.state || "").trim();
    firRecord.filingDate = new Date(firData.filingDate || firRecord.filingDate);
    if (firData.incidentDate) firRecord.incidentDate = new Date(firData.incidentDate);
    if (firData.complainantName) firRecord.complainantName = firData.complainantName.trim();
    if (firData.relationship) firRecord.relationship = firData.relationship.trim();
    if (firData.contactPhone) firRecord.contactPhone = firData.contactPhone.trim();
    firRecord.status = "pending_review";
    firRecord.rejectedBy = null;
    firRecord.rejectedAt = null;
    firRecord.latestRejectionReason = null;
    documentRecord.version = (firRecord.documents?.length || 0) + 1;
    // Deactivate previous
    firRecord.documents.forEach((d) => {
      d.isActive = false;
    });
    firRecord.documents.push(documentRecord);
  }

  await firRecord.save();

  // 8. Synchronize MissingCase
  missingCase.firNumber = firRecord.firNumber;
  missingCase.firId = firRecord._id;
  missingCase.firStatus = "pending_review";
  await missingCase.save();

  // 9. Centralized Audit Logging
  await auditLogService.recordAuditEvent({
    req,
    actor: user,
    action: "FIR_CREATED",
    entityType: "FIR",
    entityId: firRecord._id.toString(),
    outcome: "success",
    metadata: {
      firNumber: firRecord.firNumber,
      policeStation: firRecord.policeStation,
      missingCaseId: caseId.toString(),
      childId: missingCase.childId.toString(),
      documentVersion: documentRecord.version,
      sha256Checksum: documentRecord.sha256Checksum
    }
  });

  await auditLogService.recordAuditEvent({
    req,
    actor: user,
    action: "FIR_DOCUMENT_UPLOADED",
    entityType: "FIR",
    entityId: firRecord._id.toString(),
    outcome: "success",
    metadata: {
      documentVersion: documentRecord.version,
      originalFilename: documentRecord.originalFilename,
      mimeType: documentRecord.mimeType,
      fileSizeBytes: documentRecord.fileSizeBytes
    }
  });

  // 10. Fetch child details and notify responders (non-blocking)
  const child = await Child.findById(missingCase.childId);
  notifyPoliceResponders({ fir: firRecord, missingCase, child, isResubmission: false });

  return firRecord.toSafeObject({ role: user.role, userId: user._id });
}

/**
 * 2. Replace FIR document with a newer version (Parent or Admin)
 */
async function replaceDocument({ firId, fileBuffer, fileMeta, replacementReason, user, req = null }) {
  if (!firId || !mongoose.Types.ObjectId.isValid(firId)) {
    throw new FIRServiceError("Invalid FIR ID", 400, "INVALID_FIR_ID");
  }

  const fir = await FIR.findById(firId);
  if (!fir) {
    throw new FIRServiceError("FIR record not found", 404, "FIR_NOT_FOUND");
  }

  // Authorization check
  const isOwner = user && user._id && String(fir.submittedBy) === String(user._id);
  const isAdmin = user && user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new FIRServiceError(
      "Access denied: You are not authorized to update documents for this FIR",
      403,
      "UNAUTHORIZED_UPDATE"
    );
  }

  // If verified, disallow replacing document without administrator intervention
  if (fir.status === "verified" && !isAdmin) {
    throw new FIRServiceError(
      "This FIR has already been verified by law enforcement. Contact authorities for corrections.",
      400,
      "FIR_ALREADY_VERIFIED"
    );
  }

  // Validate new document
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new FIRServiceError("New replacement document file is required", 400, "FILE_REQUIRED");
  }

  const validationResult = documentSecurityValidator.validateDocument(
    fileBuffer,
    fileMeta.originalname,
    fileMeta.mimetype
  );

  const nextVersion = (fir.documents?.length || 0) + 1;
  const storageKey = documentStorageService.generateStorageKey(fir.missingCaseId, nextVersion, validationResult.extension);
  await documentStorageService.saveDocument(fileBuffer, storageKey);

  // Deactivate previous active documents
  fir.documents.forEach((d) => {
    d.isActive = false;
  });

  const newDocRecord = {
    version: nextVersion,
    originalFilename: validationResult.originalFilename,
    storageKey,
    fileExtension: validationResult.extension,
    mimeType: validationResult.detectedMimeType,
    fileSizeBytes: validationResult.sizeBytes,
    sha256Checksum: validationResult.sha256Checksum,
    uploadedAt: new Date(),
    uploadedBy: user._id,
    isActive: true,
    replacementReason: (replacementReason || "Updated document version uploaded").trim()
  };

  fir.documents.push(newDocRecord);

  // Reset status to pending review
  fir.status = "pending_review";
  fir.rejectedBy = null;
  fir.rejectedAt = null;
  fir.latestRejectionReason = null;

  // Append history entry
  fir.verificationHistory.push({
    action: "resubmitted",
    actionAt: new Date(),
    performedBy: user._id,
    officerName: user.name || "Reporting Parent",
    officerBadge: "",
    officerStation: "",
    reviewNotes: `Document replacement uploaded (v${nextVersion}). Reason: ${replacementReason || "Correction/update"}.`,
    rejectionReason: null,
    documentVersion: nextVersion
  });

  await fir.save();

  // Sync MissingCase
  await MissingCase.findByIdAndUpdate(fir.missingCaseId, { firStatus: "pending_review" });

  // Centralized Audit Log
  await auditLogService.recordAuditEvent({
    req,
    actor: user,
    action: "FIR_DOCUMENT_REPLACED",
    entityType: "FIR",
    entityId: fir._id.toString(),
    outcome: "success",
    metadata: {
      previousVersion: nextVersion - 1,
      newVersion,
      sha256Checksum: newDocRecord.sha256Checksum,
      replacementReason: newDocRecord.replacementReason
    }
  });

  // Notify police responders
  const missingCase = await MissingCase.findById(fir.missingCaseId);
  const child = missingCase ? await Child.findById(missingCase.childId) : null;
  notifyPoliceResponders({ fir, missingCase, child, isResubmission: true });

  return fir.toSafeObject({ role: user.role, userId: user._id });
}

/**
 * 3. Verify an FIR (Police or Admin only)
 */
async function verifyFIR({ firId, officerUser, reviewNotes, req = null }) {
  if (!firId || !mongoose.Types.ObjectId.isValid(firId)) {
    throw new FIRServiceError("Invalid FIR ID", 400, "INVALID_FIR_ID");
  }

  // Role validation
  if (!officerUser || !["police", "admin"].includes(officerUser.role)) {
    throw new FIRServiceError("Only authorized police officers or admins can verify FIRs", 403, "UNAUTHORIZED_ROLE");
  }

  const cleanNotes = (reviewNotes || "").trim();
  if (!cleanNotes || cleanNotes.length < 5) {
    throw new FIRServiceError("A detailed verification review note (at least 5 characters) is mandatory", 400, "NOTES_REQUIRED");
  }

  const fir = await FIR.findById(firId);
  if (!fir) {
    throw new FIRServiceError("FIR record not found", 404, "FIR_NOT_FOUND");
  }

  if (fir.status === "verified") {
    return fir.toSafeObject({ role: officerUser.role, userId: officerUser._id });
  }

  const activeDoc = fir.getActiveDocument();
  const currentVersion = activeDoc ? activeDoc.version : 1;

  const officerBadge = officerUser.badgeNumber || officerUser.policeDetails?.badgeNumber || "";
  const officerStation = officerUser.station || officerUser.policeDetails?.station || fir.policeStation;

  // Atomic state transition
  fir.status = "verified";
  fir.verifiedBy = officerUser._id;
  fir.verifiedAt = new Date();
  fir.rejectedBy = null;
  fir.rejectedAt = null;
  fir.latestReviewNotes = cleanNotes;
  fir.latestRejectionReason = null;

  fir.verificationHistory.push({
    action: "verified",
    actionAt: new Date(),
    performedBy: officerUser._id,
    officerName: officerUser.name || "Police Officer",
    officerBadge,
    officerStation,
    reviewNotes: cleanNotes,
    rejectionReason: null,
    documentVersion: currentVersion
  });

  await fir.save();

  // Sync MissingCase
  await MissingCase.findByIdAndUpdate(fir.missingCaseId, {
    firNumber: fir.firNumber,
    firId: fir._id,
    firStatus: "verified"
  });

  // Record Audit Log
  await auditLogService.recordAuditEvent({
    req,
    actor: officerUser,
    action: "FIR_VERIFIED",
    entityType: "FIR",
    entityId: fir._id.toString(),
    outcome: "success",
    metadata: {
      firNumber: fir.firNumber,
      policeStation: fir.policeStation,
      officerBadge,
      documentVersion: currentVersion,
      notesLength: cleanNotes.length
    }
  });

  // Notify parent
  notifyParentOnStatusChange({
    fir,
    action: "verified",
    officerUser,
    notes: cleanNotes
  });

  return fir.toSafeObject({ role: officerUser.role, userId: officerUser._id });
}

/**
 * 4. Reject an FIR with mandatory rejection reason and review notes (Police or Admin only)
 */
async function rejectFIR({ firId, officerUser, reviewNotes, rejectionReason, req = null }) {
  if (!firId || !mongoose.Types.ObjectId.isValid(firId)) {
    throw new FIRServiceError("Invalid FIR ID", 400, "INVALID_FIR_ID");
  }

  // Role check
  if (!officerUser || !["police", "admin"].includes(officerUser.role)) {
    throw new FIRServiceError("Only authorized police officers or admins can review FIRs", 403, "UNAUTHORIZED_ROLE");
  }

  const cleanNotes = (reviewNotes || "").trim();
  const cleanReason = (rejectionReason || "").trim();

  if (!cleanReason || cleanReason.length < 5) {
    throw new FIRServiceError("A specific rejection reason (at least 5 characters) is required", 400, "REJECTION_REASON_REQUIRED");
  }
  if (!cleanNotes || cleanNotes.length < 5) {
    throw new FIRServiceError("Detailed officer review notes (at least 5 characters) are required", 400, "REVIEW_NOTES_REQUIRED");
  }

  const fir = await FIR.findById(firId);
  if (!fir) {
    throw new FIRServiceError("FIR record not found", 404, "FIR_NOT_FOUND");
  }

  if (fir.status === "verified") {
    throw new FIRServiceError("Cannot reject an already verified FIR without formal administrative revocation", 400, "INVALID_STATE_TRANSITION");
  }

  const activeDoc = fir.getActiveDocument();
  const currentVersion = activeDoc ? activeDoc.version : 1;

  const officerBadge = officerUser.badgeNumber || officerUser.policeDetails?.badgeNumber || "";
  const officerStation = officerUser.station || officerUser.policeDetails?.station || fir.policeStation;

  fir.status = "rejected";
  fir.rejectedBy = officerUser._id;
  fir.rejectedAt = new Date();
  fir.verifiedBy = null;
  fir.verifiedAt = null;
  fir.latestReviewNotes = cleanNotes;
  fir.latestRejectionReason = cleanReason;

  fir.verificationHistory.push({
    action: "rejected",
    actionAt: new Date(),
    performedBy: officerUser._id,
    officerName: officerUser.name || "Police Officer",
    officerBadge,
    officerStation,
    reviewNotes: cleanNotes,
    rejectionReason: cleanReason,
    documentVersion: currentVersion
  });

  await fir.save();

  // Sync MissingCase
  await MissingCase.findByIdAndUpdate(fir.missingCaseId, {
    firStatus: "rejected"
  });

  // Record Audit Log
  await auditLogService.recordAuditEvent({
    req,
    actor: officerUser,
    action: "FIR_REJECTED",
    entityType: "FIR",
    entityId: fir._id.toString(),
    outcome: "success",
    metadata: {
      firNumber: fir.firNumber,
      policeStation: fir.policeStation,
      rejectionReason: cleanReason,
      documentVersion: currentVersion
    }
  });

  // Notify parent
  notifyParentOnStatusChange({
    fir,
    action: "rejected",
    officerUser,
    notes: cleanNotes,
    rejectionReason: cleanReason
  });

  return fir.toSafeObject({ role: officerUser.role, userId: officerUser._id });
}

/**
 * 5. Get FIR by Missing Case ID with strict role scoping and IDOR protection
 */
async function getFIRByCaseId({ caseId, user }) {
  if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
    throw new FIRServiceError("Invalid missing case ID", 400, "INVALID_CASE_ID");
  }

  const fir = await FIR.findOne({ missingCaseId: caseId });
  if (!fir) {
    return null;
  }

  const userRole = user?.role || "citizen";
  const userId = user?._id ? String(user._id) : null;
  const isOwner = userId && String(fir.submittedBy) === userId;
  const isPrivileged = userRole === "police" || userRole === "admin";

  // IDOR & RBAC Protection: Citizen has zero access; parent only sees their own case
  if (userRole === "citizen") {
    throw new FIRServiceError("Access denied: Citizens are not authorized to view case FIRs", 403, "ACCESS_DENIED");
  }

  if (userRole === "parent" && !isOwner) {
    throw new FIRServiceError("Access denied: You are not authorized to view this FIR", 403, "ACCESS_DENIED");
  }

  // NGO receives minimal operational view
  if (userRole === "ngo") {
    return {
      _id: fir._id,
      missingCaseId: fir.missingCaseId,
      firNumber: fir.firNumber,
      policeStation: fir.policeStation,
      status: fir.status,
      filingDate: fir.filingDate,
      activeDocument: fir.getActiveDocument()
        ? {
            version: fir.getActiveDocument().version,
            fileExtension: fir.getActiveDocument().fileExtension
          }
        : null
    };
  }

  return fir.toSafeObject({ role: userRole, userId });
}

/**
 * 6. Get FIR by FIR ID with strict role scoping
 */
async function getFIRById({ firId, user }) {
  if (!firId || !mongoose.Types.ObjectId.isValid(firId)) {
    throw new FIRServiceError("Invalid FIR ID", 400, "INVALID_FIR_ID");
  }

  const fir = await FIR.findById(firId);
  if (!fir) {
    throw new FIRServiceError("FIR record not found", 404, "FIR_NOT_FOUND");
  }

  const userRole = user?.role || "citizen";
  const userId = user?._id ? String(user._id) : null;
  const isOwner = userId && String(fir.submittedBy) === userId;
  const isPrivileged = userRole === "police" || userRole === "admin";

  if (userRole === "citizen") {
    throw new FIRServiceError("Access denied", 403, "ACCESS_DENIED");
  }

  if (userRole === "parent" && !isOwner) {
    throw new FIRServiceError("Access denied: You are not authorized to view this FIR", 403, "ACCESS_DENIED");
  }

  if (userRole === "ngo") {
    return {
      _id: fir._id,
      missingCaseId: fir.missingCaseId,
      firNumber: fir.firNumber,
      policeStation: fir.policeStation,
      status: fir.status,
      filingDate: fir.filingDate
    };
  }

  return fir.toSafeObject({ role: userRole, userId });
}

/**
 * 7. List pending FIRs (Police and Admin only)
 */
async function getPendingFIRs({ user, query = {} }) {
  if (!user || !["police", "admin"].includes(user.role)) {
    throw new FIRServiceError("Access denied: Police and Admin privileges required", 403, "ACCESS_DENIED");
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { status: "pending_review" };
  if (query.policeStation) {
    filter.policeStation = new RegExp(query.policeStation.trim(), "i");
  }

  const [firs, totalCount] = await Promise.all([
    FIR.find(filter)
      .populate("missingCaseId", "caseNumber status priority lastSeenLocation")
      .populate("childId", "fullName age gender photoUrl")
      .populate("submittedBy", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    FIR.countDocuments(filter)
  ]);

  const sanitized = firs.map((f) => {
    const safe = f.toSafeObject({ role: user.role, userId: user._id });
    safe.missingCase = f.missingCaseId;
    safe.child = f.childId;
    safe.submittedByUser = f.submittedBy ? { name: f.submittedBy.name, email: f.submittedBy.email } : null;
    return safe;
  });

  return {
    firs: sanitized,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

/**
 * 8. Retrieve secure document stream for preview or download
 */
async function getDocumentStream({ firId, version = null, user, req = null }) {
  if (!firId || !mongoose.Types.ObjectId.isValid(firId)) {
    throw new FIRServiceError("Invalid FIR ID", 400, "INVALID_FIR_ID");
  }

  const fir = await FIR.findById(firId);
  if (!fir) {
    throw new FIRServiceError("FIR record not found", 404, "FIR_NOT_FOUND");
  }

  const userRole = user?.role || "citizen";
  const userId = user?._id ? String(user._id) : null;
  const isOwner = userId && String(fir.submittedBy) === userId;
  const isPrivileged = userRole === "police" || userRole === "admin";

  // Strict document access security: citizens and NGOs are never allowed to download/preview documents
  if (!isOwner && !isPrivileged) {
    await auditLogService.recordAuditEvent({
      req,
      actor: user,
      action: "FIR_DOCUMENT_ACCESSED",
      entityType: "FIR",
      entityId: fir._id.toString(),
      outcome: "denied",
      metadata: { requestedVersion: version, reason: "Unauthorized role access attempt" }
    });
    throw new FIRServiceError("Access denied: You are not authorized to access this document", 403, "ACCESS_DENIED");
  }

  // Find targeted document version
  let targetDoc = null;
  if (version && version !== "latest") {
    const versionNum = parseInt(version, 10);
    targetDoc = fir.documents.find((d) => d.version === versionNum);
  } else {
    targetDoc = fir.getActiveDocument();
  }

  if (!targetDoc) {
    throw new FIRServiceError("Specified document version was not found in records", 404, "DOCUMENT_VERSION_NOT_FOUND");
  }

  // Verify file existence in private storage
  if (!documentStorageService.documentExists(targetDoc.storageKey)) {
    throw new FIRServiceError("Physical document archive not found on disk", 404, "FILE_NOT_FOUND");
  }

  // Log successful access in audit log
  await auditLogService.recordAuditEvent({
    req,
    actor: user,
    action: "FIR_DOCUMENT_ACCESSED",
    entityType: "FIR",
    entityId: fir._id.toString(),
    outcome: "success",
    metadata: {
      documentVersion: targetDoc.version,
      originalFilename: targetDoc.originalFilename,
      mimeType: targetDoc.mimeType,
      fileSizeBytes: targetDoc.fileSizeBytes
    }
  });

  const readStream = documentStorageService.getDocumentReadStream(targetDoc.storageKey);

  return {
    readStream,
    mimeType: targetDoc.mimeType,
    originalFilename: targetDoc.originalFilename,
    fileSizeBytes: targetDoc.fileSizeBytes,
    version: targetDoc.version
  };
}

module.exports = {
  FIRServiceError,
  createFIR,
  replaceDocument,
  verifyFIR,
  rejectFIR,
  getFIRByCaseId,
  getFIRById,
  getPendingFIRs,
  getDocumentStream
};

