const mongoose = require("mongoose");
const Child = require("../models/Child");

/**
 * @desc    Register a new child under the authenticated parent
 * @route   POST /api/children
 * @access  Private (Parent only)
 */
exports.createChild = async (req, res, next) => {
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

    // Security: Ownership is ALWAYS derived strictly from the authenticated parent session
    const child = new Child({
      guardianId: req.user._id,
      fullName: childFullName,
      dateOfBirth: birthDate,
      gender: normalizedGender,
      description: (description || "").trim(),
      photoUrl: photoUrl || photo || (Array.isArray(photos) && photos[0]) || "",
      photos: Array.isArray(photos) ? photos : (photoUrl || photo ? [photoUrl || photo] : []),
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
      hasMedicalInfo: Boolean(hasMedicalInfo),
      medicalConditions: (medicalConditions || "None").trim(),
      allergies: (allergies || "None").trim(),
      medications: (medications || "None").trim(),
      doctorName: (doctorName || "").trim(),
      doctorContact: (doctorContact || "").trim(),
      medicalNotes: (medicalNotes || "").trim(),
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
      status: "active"
    });

    await child.save();

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
 * @desc    Update a child's profile details (scoped to authenticated parent)
 * @route   PATCH /api/children/:id
 * @access  Private (Parent only)
 */
exports.updateChild = async (req, res, next) => {
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
        child.photoUrl = updates[key] || "";
      } else if (key === "photos") {
        if (Array.isArray(updates.photos)) {
          child.photos = updates.photos;
        }
      } else if (key === "emergencyContacts") {
        if (Array.isArray(updates.emergencyContacts)) {
          child.emergencyContacts = updates.emergencyContacts;
        }
      } else {
        child[key] = updates[key];
      }
    }

    await child.save();

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
