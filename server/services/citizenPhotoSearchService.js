/**
 * GuardianLink — Citizen Photo Search Service (Phase 6.9)
 *
 * Implements privacy-safe citizen facial similarity search against active missing cases:
 * 1. Dispatches search query to the FastAPI AI microservice via the existing aiService client.
 * 2. Resolves candidate identifiers strictly through authoritative MongoDB Child records.
 * 3. Enforces missing-case eligibility: ONLY active, reported, or under_verification cases are disclosed.
 * 4. Fails closed: Children with no active case, closed cases, or inactive status are dropped.
 * 5. Applies a strict disclosure allowlist: Zero guardian PII, zero medical data, zero raw vectors.
 * 6. Qualifies results as unverified potential leads requiring independent verification.
 */

const mongoose = require("mongoose");
const Child = require("../models/Child");
const MissingCase = require("../models/MissingCase");
const aiService = require("./aiService");
const { getAIConfig } = require("../config/ai");

// Permissible missing case statuses for public citizen search disclosure
const ELIGIBLE_CASE_STATUSES = ["active", "reported", "under_verification"];

// Terminal or non-disclosable case statuses
const INELIGIBLE_CASE_STATUSES = ["found", "reunited", "closed", "cancelled"];

/**
 * Serializes a validated candidate and its associated MongoDB records
 * into a privacy-safe public disclosure object.
 *
 * STRICT PRIVACY BOUNDARY:
 * Explicitly excludes: guardianId, parent contact, emergency contacts, medical notes,
 * raw embeddings, Qdrant point IDs, internal tokens, and signed storage tokens.
 *
 * @param {Object} candidate - AI candidate object { childId, similarity, confidence? }
 * @param {Object} child - Authoritative Child Mongoose document
 * @param {Object} missingCase - Authoritative MissingCase Mongoose document
 * @returns {Object} Publicly disclosable candidate lead object
 */
const serializeCitizenCandidate = (candidate, child, missingCase) => {
  const loc = missingCase.lastSeenLocation || {};
  const locationParts = [loc.city, loc.state].filter(Boolean);
  const locationString = locationParts.join(", ") || (loc.address ? "Location on record" : "Unknown");

  const similarity = Number(candidate.similarity);
  const matchConfidence = similarity >= 0.85 ? "HIGH" : (similarity >= 0.70 ? "MEDIUM" : "LOW");

  return {
    candidateId: `lead_${missingCase._id.toString().slice(-8)}`,
    caseId: missingCase._id.toString(),
    caseNumber: missingCase.caseNumber,
    childId: child._id.toString(),
    name: child.fullName,
    age: child.age !== null && child.age !== undefined ? child.age : null,
    gender: child.gender,
    description: missingCase.lastSeenDescription || child.description || "",
    lastSeenLocation: locationString,
    missingDate: missingCase.missingDate ? missingCase.missingDate.toISOString() : "",
    photoUrl: child.photoUrl || "",
    caseStatus: missingCase.status,
    priority: missingCase.priority || "high",
    similarity: Number(similarity.toFixed(4)),
    matchConfidence,
    disclaimer: "Potential biometric lead. Requires independent law enforcement and guardian verification."
  };
};

/**
 * Executes a privacy-safe biometric similarity search for an authorized citizen:
 * 1. Dispatches image to AI microservice
 * 2. Resolves candidates in MongoDB
 * 3. Enforces missing-case eligibility and privacy boundaries
 * 4. Serializes output through the strict disclosure allowlist
 *
 * @param {Object} params
 * @param {Buffer} params.imageBuffer - Raw query image buffer
 * @param {string} [params.mimeType='image/jpeg'] - Image MIME type
 * @param {string} [params.filename='sighting.jpg'] - Upload filename
 * @param {number} [params.limit=5] - Maximum disclosable candidates (1-20)
 * @param {number} [params.threshold] - Custom similarity threshold override (-1.0 to 1.0)
 * @param {Object} [options] - Injectable overrides for testing (e.g. aiClient)
 * @returns {Promise<{
 *   matchFound: boolean,
 *   candidates: Array<Object>,
 *   totalCandidates: number,
 *   thresholdApplied: number,
 *   message: string,
 *   disclaimer: string
 * }>}
 */
const searchMissingChildPhoto = async (params, options = {}) => {
  if (!params || !params.imageBuffer || !Buffer.isBuffer(params.imageBuffer)) {
    const err = new Error("Invalid image data. A non-empty image Buffer is required.");
    err.code = "INVALID_IMAGE_BUFFER";
    err.status = 400;
    throw err;
  }

  const client = options.aiClient || aiService;
  const config = getAIConfig();

  const requestedLimit = params.limit !== undefined ? Number(params.limit) : 5;
  const activeLimit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 5, 1), 20);

  const activeThreshold = params.threshold !== undefined && Number.isFinite(Number(params.threshold))
    ? Number(params.threshold)
    : config.defaultThreshold;

  // 1. Dispatch search to AI microservice (InsightFace + Qdrant)
  const aiResponse = await client.searchFace({
    imageBuffer: params.imageBuffer,
    mimeType: params.mimeType || "image/jpeg",
    filename: params.filename || "sighting.jpg",
    limit: activeLimit * 2, // Request wider pool to account for eligibility filtering
    threshold: activeThreshold
  });

  const rawCandidates = aiResponse && Array.isArray(aiResponse.candidates) ? aiResponse.candidates : [];

  if (rawCandidates.length === 0) {
    return {
      matchFound: false,
      candidates: [],
      totalCandidates: 0,
      thresholdApplied: activeThreshold,
      message: "No potential matches found for active missing child cases.",
      disclaimer: "AI similarity search results represent potential leads only and do not constitute verified identification."
    };
  }

  // 2. Validate candidate identifiers and extract valid ObjectIds
  const candidateIdMap = new Map();
  for (const c of rawCandidates) {
    if (
      c &&
      c.childId &&
      mongoose.Types.ObjectId.isValid(c.childId) &&
      typeof c.similarity === "number" &&
      Number.isFinite(c.similarity) &&
      c.similarity >= -1.0 &&
      c.similarity <= 1.0
    ) {
      const childIdStr = c.childId.toString();
      // Keep highest similarity if duplicate child returned by AI
      if (!candidateIdMap.has(childIdStr) || candidateIdMap.get(childIdStr).similarity < c.similarity) {
        candidateIdMap.set(childIdStr, c);
      }
    }
  }

  const validChildIds = Array.from(candidateIdMap.keys());
  if (validChildIds.length === 0) {
    return {
      matchFound: false,
      candidates: [],
      totalCandidates: 0,
      thresholdApplied: activeThreshold,
      message: "No potential matches found for active missing child cases.",
      disclaimer: "AI similarity search results represent potential leads only and do not constitute verified identification."
    };
  }

  // 3. Batch-resolve active Child documents from MongoDB
  const children = await Child.find({
    _id: { $in: validChildIds },
    status: "active" // Inactive child records are strictly excluded
  });

  const childMap = new Map();
  for (const child of children) {
    childMap.set(child._id.toString(), child);
  }

  // 4. Batch-resolve active MissingCase records for these children
  const activeCases = await MissingCase.find({
    childId: { $in: Array.from(childMap.keys()) },
    status: { $in: ELIGIBLE_CASE_STATUSES }
  }).sort({ createdAt: -1 });

  // Map each child to their most recent active missing case
  const childCaseMap = new Map();
  for (const mCase of activeCases) {
    const cid = mCase.childId.toString();
    if (!childCaseMap.has(cid)) {
      childCaseMap.set(cid, mCase);
    }
  }

  // 5. Fail-Closed Privacy & Eligibility Filter
  // Only disclose candidates where:
  // - Child exists and is active
  // - Child has an authoritative active missing case
  // - Case status is strictly one of: active, reported, under_verification
  const disclosedCandidates = [];
  const processedCaseIds = new Set();

  for (const [childIdStr, candidate] of candidateIdMap.entries()) {
    const child = childMap.get(childIdStr);
    const missingCase = childCaseMap.get(childIdStr);

    if (!child || !missingCase) {
      // Child has no active missing case or is inactive -> FAIL CLOSED (silently drop)
      continue;
    }

    if (processedCaseIds.has(missingCase._id.toString())) {
      continue;
    }

    processedCaseIds.add(missingCase._id.toString());
    const publicLead = serializeCitizenCandidate(candidate, child, missingCase);
    disclosedCandidates.push(publicLead);
  }

  // 6. Sort deterministically by similarity score descending
  disclosedCandidates.sort((a, b) => b.similarity - a.similarity);

  // 7. Enforce final client limit
  const finalCandidates = disclosedCandidates.slice(0, activeLimit);

  return {
    matchFound: finalCandidates.length > 0,
    candidates: finalCandidates,
    totalCandidates: finalCandidates.length,
    thresholdApplied: activeThreshold,
    message: finalCandidates.length > 0
      ? `Found ${finalCandidates.length} potential matching lead(s).`
      : "No potential matches found for active missing child cases.",
    disclaimer: "AI similarity search results represent potential leads only and do not constitute verified identification."
  };
};

module.exports = {
  searchMissingChildPhoto,
  serializeCitizenCandidate,
  ELIGIBLE_CASE_STATUSES,
  INELIGIBLE_CASE_STATUSES
};
