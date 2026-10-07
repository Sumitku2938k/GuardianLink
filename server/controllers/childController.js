const mongoose = require("mongoose");
const Child = require("../models/Child");
const { uploadImage, deleteImage } = require("../config/cloudinary");

/**
 * Helper to safely parse JSON strings from multipart/form-data
 */
const safeJsonParse = (val, fallback) => {
  if (typeof val !== "string") return val !== undefined ? val : fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

/**
 * @desc    Register a new child under the authenticated parent with optional Cloudinary image upload
 * @route   POST /api/children
 * @access  Private (Parent only)
 */
exports.createChild = async (req, res, next) => {
  let uploadedPhoto = null;

  try {
    const {
      fullName,
      name,
      dateOfBirth,
      dob,
      gender,
      description,
      photoUrl,
      photo,
      nickname,
      bloodGroup,
      height,
      weight,
      schoolName,
      languages,
      lastLocation,
      emergencyPin,
      distinctiveMarks,
      scars,
      birthmarks,
      otherMarks,
      hasMedicalInfo,
      medicalConditions,
      allergies,
      medications,
      doctorName,
      doctorContact,
      medicalNotes,
      emergencyContacts,
      photos
    } = req.body || {};

    const childFullName = (fullName || name || "").trim();
    const childDobRaw = dateOfBirth || dob;

    if (!childFullName) {
      return res.status(400).json({
        success: false,
        message: "Child full name is required.",
        code: "MISSING_FULL_NAME"
      });
    }

    if (!childDobRaw) {
      return res.status(400).json({
        success: false,
        message: "Date of birth is required.",
        code: "MISSING_DOB"
      });
    }

    const birthDate = new Date(childDobRaw);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth format.",
        code: "INVALID_DOB"
      });
    }

    if (birthDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date of birth cannot be in the future.",
        code: "FUTURE_DOB_NOT_ALLOWED"
      });
    }

    if (!gender || !gender.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Gender is required.",
        code: "MISSING_GENDER"
      });
    }

    const normalizedGender = gender.toString().toLowerCase().trim();
    const validGenders = ["male", "female", "other", "prefer_not_to_say"];
    if (!validGenders.includes(normalizedGender)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gender. Allowed: ${validGenders.join(", ")}`,
        code: "INVALID_GENDER"
      });
    }

    // Process photo: If multipart file uploaded, send to Cloudinary
    if (req.file) {
      try {
        uploadedPhoto = await uploadImage(req.file.buffer, {
          folder: "guardianlink/children"
        });
      } catch (uploadErr) {
        return res.status(uploadErr.status || 502).json({
          success: false,
          message: uploadErr.message || "Failed to upload image to storage service.",
          code: uploadErr.code || "IMAGE_UPLOAD_FAILED"
        });
      }
    }

    const parsedContacts = safeJsonParse(emergencyContacts, Array.isArray(emergencyContacts) ? emergencyContacts : []);
    const parsedPhotos = safeJsonParse(photos, Array.isArray(photos) ? photos : []);

    const resolvedPhotoUrl = uploadedPhoto
      ? uploadedPhoto.photoUrl
      : (photoUrl || photo || (Array.isArray(parsedPhotos) && parsedPhotos[0]) || "");

    const resolvedPublicId = uploadedPhoto ? uploadedPhoto.cloudinaryPublicId : "";

    const resolvedPhotosList = uploadedPhoto
      ? [uploadedPhoto.photoUrl]
      : (Array.isArray(parsedPhotos) && parsedPhotos.length > 0
          ? parsedPhotos
          : (resolvedPhotoUrl ? [resolvedPhotoUrl] : []));

    // Security: Ownership is ALWAYS derived strictly from the authenticated parent session
    const child = new Child({
      guardianId: req.user._id,
      fullName: childFullName,
      dateOfBirth: birthDate,
      gender: normalizedGender,
      description: (description || "").trim(),
      photoUrl: resolvedPhotoUrl,
      cloudinaryPublicId: resolvedPublicId,
      faceProfileId: "", // Untouched in Phase 3 as per architectural requirement
      photos: resolvedPhotosList,
      nickname: (nickname || "").trim(),
      bloodGroup: (bloodGroup || "Unknown").trim(),
      height: (height || "N/A").trim(),
      weight: (weight || "N/A").trim(),
      schoolName: (schoolName || "").trim(),
      languages: (languages || "Hindi, English").trim(),
      lastLocation: (lastLocation || "").trim(),
      emergencyPin: (emergencyPin || `GL-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
      distinctiveMarks: (distinctiveMarks || "None").trim(),
      scars: (scars || "None").trim(),
      birthmarks: (birthmarks || "None").trim(),
      otherMarks: (otherMarks || "None").trim(),
      hasMedicalInfo: Boolean(hasMedicalInfo === true || hasMedicalInfo === "true"),
      medicalConditions: (medicalConditions || "None").trim(),
      allergies: (allergies || "None").trim(),
      medications: (medications || "None").trim(),
      doctorName: (doctorName || "").trim(),
      doctorContact: (doctorContact || "").trim(),
      medicalNotes: (medicalNotes || "").trim(),
      emergencyContacts: Array.isArray(parsedContacts) ? parsedContacts : [],
      status: "active"
    });

    try {
      await child.save();
    } catch (saveErr) {
      // Failure safety: If MongoDB save fails, clean up newly uploaded Cloudinary asset
      if (uploadedPhoto && uploadedPhoto.cloudinaryPublicId) {
        console.warn("MongoDB save failed after Cloudinary upload. Cleaning up orphaned image:", uploadedPhoto.cloudinaryPublicId);
        await deleteImage(uploadedPhoto.cloudinaryPublicId);
      }
      throw saveErr;
    }

    return res.status(201).json({
      success: true,
      message: "Child profile registered successfully.",
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all children belonging to the authenticated parent
 * @route   GET /api/children
 * @access  Private (Parent only)
 */
exports.getChildren = async (req, res, next) => {
  try {
    const query = { guardianId: req.user._id };

    if (req.query.status && ["active", "inactive"].includes(req.query.status.toLowerCase())) {
      query.status = req.query.status.toLowerCase();
    }

    const children = await Child.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: children.length,
      children: children.map((c) => c.toSafeObject())
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single child by ID (scoped to authenticated parent)
 * @route   GET /api/children/:id
 * @access  Private (Parent only)
 */
exports.getChildById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID format.",
        code: "INVALID_CHILD_ID"
      });
    }

    // Ownership Enforced at DB Query: only find if owned by this parent
    const child = await Child.findOne({
      _id: id,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found.",
        code: "CHILD_NOT_FOUND"
      });
    }

    return res.status(200).json({
      success: true,
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a child's profile details and/or replace photo (scoped to authenticated parent)
 * @route   PATCH /api/children/:id
 * @access  Private (Parent only)
 */
exports.updateChild = async (req, res, next) => {
  let newUpload = null;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID format.",
        code: "INVALID_CHILD_ID"
      });
    }

    const child = await Child.findOne({
      _id: id,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found.",
        code: "CHILD_NOT_FOUND"
      });
    }

    const oldPublicId = child.cloudinaryPublicId;

    // Handle new photo upload if provided via multipart/form-data
    if (req.file) {
      try {
        newUpload = await uploadImage(req.file.buffer, {
          folder: `guardianlink/children/${child._id}`
        });
      } catch (uploadErr) {
        return res.status(uploadErr.status || 502).json({
          success: false,
          message: uploadErr.message || "Failed to upload replacement image.",
          code: uploadErr.code || "IMAGE_UPLOAD_FAILED"
        });
      }

      child.photoUrl = newUpload.photoUrl;
      child.cloudinaryPublicId = newUpload.cloudinaryPublicId;
      child.photos = [newUpload.photoUrl];
    }

    // Explicit allowlist of updateable fields - never blindly spread req.body
    const allowedFields = [
      "fullName",
      "name",
      "dateOfBirth",
      "dob",
      "gender",
      "description",
      "photoUrl",
      "photo",
      "photos",
      "nickname",
      "bloodGroup",
      "height",
      "weight",
      "schoolName",
      "languages",
      "lastLocation",
      "emergencyPin",
      "distinctiveMarks",
      "scars",
      "birthmarks",
      "otherMarks",
      "hasMedicalInfo",
      "medicalConditions",
      "allergies",
      "medications",
      "doctorName",
      "doctorContact",
      "medicalNotes",
      "emergencyContacts"
    ];

    const updates = req.body || {};

    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) continue;

      if (key === "fullName" || key === "name") {
        if (updates[key] && updates[key].trim()) {
          child.fullName = updates[key].trim();
        }
      } else if (key === "dateOfBirth" || key === "dob") {
        const parsedDob = new Date(updates[key]);
        if (!isNaN(parsedDob.getTime())) {
          if (parsedDob > new Date()) {
            return res.status(400).json({
              success: false,
              message: "Date of birth cannot be in the future.",
              code: "FUTURE_DOB_NOT_ALLOWED"
            });
          }
          child.dateOfBirth = parsedDob;
        }
      } else if (key === "gender") {
        const norm = updates[key].toLowerCase().trim();
        if (["male", "female", "other", "prefer_not_to_say"].includes(norm)) {
          child.gender = norm;
        }
      } else if (key === "photo" || key === "photoUrl") {
        // Only set text photoUrl if a new file upload didn't already set it
        if (!req.file) {
          child.photoUrl = updates[key] || "";
        }
      } else if (key === "photos") {
        if (!req.file) {
          const parsed = safeJsonParse(updates.photos, Array.isArray(updates.photos) ? updates.photos : []);
          if (Array.isArray(parsed)) child.photos = parsed;
        }
      } else if (key === "emergencyContacts") {
        const parsed = safeJsonParse(updates.emergencyContacts, Array.isArray(updates.emergencyContacts) ? updates.emergencyContacts : []);
        if (Array.isArray(parsed)) child.emergencyContacts = parsed;
      } else if (key === "hasMedicalInfo") {
        child.hasMedicalInfo = Boolean(updates[key] === true || updates[key] === "true");
      } else {
        child[key] = updates[key];
      }
    }

    try {
      await child.save();
    } catch (saveErr) {
      // Failure safety: If DB save fails, clean up new upload and leave old photo intact
      if (newUpload && newUpload.cloudinaryPublicId) {
        console.warn("Child update DB save failed. Cleaning up newly uploaded image:", newUpload.cloudinaryPublicId);
        await deleteImage(newUpload.cloudinaryPublicId);
      }
      throw saveErr;
    }

    // Replacement safety: Only delete old Cloudinary image after DB update succeeds
    if (newUpload && oldPublicId && oldPublicId !== newUpload.cloudinaryPublicId) {
      await deleteImage(oldPublicId);
    }

    return res.status(200).json({
      success: true,
      message: "Child profile updated successfully.",
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dedicated endpoint to replace a child's photo
 * @route   PATCH /api/children/:id/photo
 * @access  Private (Parent only)
 */
exports.updateChildPhoto = async (req, res, next) => {
  let newUpload = null;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID format.",
        code: "INVALID_CHILD_ID"
      });
    }

    const child = await Child.findOne({
      _id: id,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found.",
        code: "CHILD_NOT_FOUND"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please attach an image file with key 'photo'.",
        code: "MISSING_IMAGE_FILE"
      });
    }

    const oldPublicId = child.cloudinaryPublicId;

    try {
      newUpload = await uploadImage(req.file.buffer, {
        folder: `guardianlink/children/${child._id}`
      });
    } catch (uploadErr) {
      return res.status(uploadErr.status || 502).json({
        success: false,
        message: uploadErr.message || "Failed to upload image to storage service.",
        code: uploadErr.code || "IMAGE_UPLOAD_FAILED"
      });
    }

    child.photoUrl = newUpload.photoUrl;
    child.cloudinaryPublicId = newUpload.cloudinaryPublicId;
    child.photos = [newUpload.photoUrl];

    try {
      await child.save();
    } catch (saveErr) {
      if (newUpload && newUpload.cloudinaryPublicId) {
        await deleteImage(newUpload.cloudinaryPublicId);
      }
      throw saveErr;
    }

    // Safely delete old asset now that new asset is successfully persisted
    if (oldPublicId && oldPublicId !== newUpload.cloudinaryPublicId) {
      await deleteImage(oldPublicId);
    }

    return res.status(200).json({
      success: true,
      message: "Child photo updated successfully.",
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove child photo and delete associated Cloudinary asset
 * @route   DELETE /api/children/:id/photo
 * @access  Private (Parent only)
 */
exports.deleteChildPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID format.",
        code: "INVALID_CHILD_ID"
      });
    }

    const child = await Child.findOne({
      _id: id,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found.",
        code: "CHILD_NOT_FOUND"
      });
    }

    const oldPublicId = child.cloudinaryPublicId;
    if (oldPublicId) {
      await deleteImage(oldPublicId);
    }

    child.photoUrl = "";
    child.cloudinaryPublicId = "";
    child.photos = [];

    await child.save();

    return res.status(200).json({
      success: true,
      message: "Child photo removed successfully.",
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate/activate a child profile (soft state change, no hard deletion)
 * @route   PATCH /api/children/:id/status
 * @access  Private (Parent only)
 */
exports.updateChildStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid child ID format.",
        code: "INVALID_CHILD_ID"
      });
    }

    const child = await Child.findOne({
      _id: id,
      guardianId: req.user._id
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child record not found.",
        code: "CHILD_NOT_FOUND"
      });
    }

    const requestedStatus = (req.body?.status || "inactive").toLowerCase().trim();
    if (!["active", "inactive"].includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'inactive'.",
        code: "INVALID_STATUS"
      });
    }

    child.status = requestedStatus;
    await child.save();

    return res.status(200).json({
      success: true,
      message: `Child profile status changed to ${child.status}.`,
      child: child.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};
