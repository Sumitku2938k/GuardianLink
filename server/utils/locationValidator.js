/**
 * GuardianLink — Centralized Location & Coordinate Validator (Phase 19)
 *
 * Implements strict backend validation for geospatial coordinates & location metadata:
 * - Latitude bounds: -90 <= lat <= 90
 * - Longitude bounds: -180 <= lng <= 180
 * - Pair completeness: both coordinates must be present together
 * - Finite number verification (rejects NaN, Infinity, malformed strings)
 * - Non-negative accuracy validation
 * - Allowed source enum verification ("gps", "manual", "reported")
 * - CapturedAt timestamp sanity check
 */

class LocationValidationError extends Error {
  constructor(message, code = "INVALID_COORDINATES", statusCode = 400) {
    super(message);
    this.name = "LocationValidationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const ALLOWED_LOCATION_SOURCES = ["gps", "manual", "reported"];

/**
 * Validates and normalizes latitude/longitude pairs and location metadata
 *
 * @param {Object|string} rawLocation - Raw input location object or string
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.required=false] - Whether coordinates are mandatory
 * @returns {Object} Clean normalized location object
 */
function validateLocationCoordinates(rawLocation, options = {}) {
  const isRequired = options.required || false;

  // Handle null/undefined
  if (!rawLocation) {
    if (isRequired) {
      throw new LocationValidationError(
        "Location coordinates are required.",
        "MISSING_LOCATION_COORDINATES",
        400
      );
    }
    return {
      address: "",
      landmark: "",
      city: "",
      state: "",
      pinCode: "",
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      source: "manual",
      capturedAt: undefined
    };
  }

  // Handle plain string location representation
  if (typeof rawLocation === "string") {
    const trimmed = rawLocation.trim();
    if (isRequired) {
      throw new LocationValidationError(
        "Structured geographic coordinates (latitude and longitude) are required.",
        "MISSING_COORDINATES_IN_STRING",
        400
      );
    }
    return {
      address: trimmed,
      landmark: "",
      city: "",
      state: "",
      pinCode: "",
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      source: "manual",
      capturedAt: undefined
    };
  }

  if (typeof rawLocation !== "object" || Array.isArray(rawLocation)) {
    throw new LocationValidationError("Invalid location format provided.", "INVALID_LOCATION_FORMAT", 400);
  }

  const hasLat = rawLocation.latitude !== undefined && rawLocation.latitude !== null && rawLocation.latitude !== "";
  const hasLng = rawLocation.longitude !== undefined && rawLocation.longitude !== null && rawLocation.longitude !== "";

  // 1. Completeness check: Both coordinates must be present together
  if (hasLat && !hasLng) {
    throw new LocationValidationError(
      "Longitude must be provided together with latitude.",
      "INCOMPLETE_COORDINATES",
      400
    );
  }
  if (!hasLat && hasLng) {
    throw new LocationValidationError(
      "Latitude must be provided together with longitude.",
      "INCOMPLETE_COORDINATES",
      400
    );
  }

  if (isRequired && (!hasLat || !hasLng)) {
    throw new LocationValidationError(
      "Both latitude and longitude are required.",
      "MISSING_REQUIRED_COORDINATES",
      400
    );
  }

  let latNum = undefined;
  let lngNum = undefined;

  if (hasLat && hasLng) {
    // 2. Finite number parsing
    latNum = typeof rawLocation.latitude === "number" ? rawLocation.latitude : Number(rawLocation.latitude);
    lngNum = typeof rawLocation.longitude === "number" ? rawLocation.longitude : Number(rawLocation.longitude);

    if (!Number.isFinite(latNum) || isNaN(latNum)) {
      throw new LocationValidationError(
        "Latitude must be a valid finite number.",
        "INVALID_LATITUDE_NUMBER",
        400
      );
    }

    if (!Number.isFinite(lngNum) || isNaN(lngNum)) {
      throw new LocationValidationError(
        "Longitude must be a valid finite number.",
        "INVALID_LONGITUDE_NUMBER",
        400
      );
    }

    // 3. Coordinate boundary validation
    if (latNum < -90 || latNum > 90) {
      throw new LocationValidationError(
        `Latitude ${latNum} is out of bounds. Must be between -90 and 90 degrees.`,
        "LATITUDE_OUT_OF_BOUNDS",
        400
      );
    }

    if (lngNum < -180 || lngNum > 180) {
      throw new LocationValidationError(
        `Longitude ${lngNum} is out of bounds. Must be between -180 and 180 degrees.`,
        "LONGITUDE_OUT_OF_BOUNDS",
        400
      );
    }
  }

  // 4. Accuracy validation
  let accuracyNum = undefined;
  if (rawLocation.accuracy !== undefined && rawLocation.accuracy !== null && rawLocation.accuracy !== "") {
    accuracyNum = typeof rawLocation.accuracy === "number" ? rawLocation.accuracy : Number(rawLocation.accuracy);
    if (!Number.isFinite(accuracyNum) || isNaN(accuracyNum) || accuracyNum < 0) {
      throw new LocationValidationError(
        "GPS accuracy must be a valid non-negative number in meters.",
        "INVALID_ACCURACY_VALUE",
        400
      );
    }
  }

  // 5. Source validation
  let source = "manual";
  if (rawLocation.source) {
    const cleanSource = String(rawLocation.source).toLowerCase().trim();
    if (!ALLOWED_LOCATION_SOURCES.includes(cleanSource)) {
      throw new LocationValidationError(
        `Invalid location source '${rawLocation.source}'. Allowed: ${ALLOWED_LOCATION_SOURCES.join(", ")}`,
        "INVALID_LOCATION_SOURCE",
        400
      );
    }
    source = cleanSource;
  }

  // 6. CapturedAt validation
  let capturedAt = undefined;
  if (rawLocation.capturedAt) {
    const d = new Date(rawLocation.capturedAt);
    if (isNaN(d.getTime())) {
      throw new LocationValidationError("Invalid capturedAt date format.", "INVALID_CAPTURE_TIMESTAMP", 400);
    }
    // Disallow future timestamp by more than 5 minutes clock drift
    const fiveMinsFuture = new Date(Date.now() + 5 * 60 * 1000);
    if (d > fiveMinsFuture) {
      throw new LocationValidationError("CapturedAt timestamp cannot be in the future.", "FUTURE_CAPTURE_TIMESTAMP", 400);
    }
    capturedAt = d;
  } else if (hasLat && hasLng) {
    capturedAt = new Date();
  }

  return {
    address: (rawLocation.address || rawLocation.location || "").trim(),
    landmark: (rawLocation.landmark || "").trim(),
    city: (rawLocation.city || "").trim(),
    state: (rawLocation.state || "").trim(),
    pinCode: (rawLocation.pinCode || "").trim(),
    latitude: latNum,
    longitude: lngNum,
    accuracy: accuracyNum,
    source,
    capturedAt
  };
}

module.exports = {
  LocationValidationError,
  validateLocationCoordinates,
  ALLOWED_LOCATION_SOURCES
};

