const User = require("../models/User");

// @desc    Get all users with optional filtering & search
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;

    const query = {};

    if (role && role !== "All" && role !== "all") {
      query.role = role.toLowerCase();
    }

    if (status && status !== "All" && status !== "all") {
      query.status = status.toLowerCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { organization: searchRegex }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    const safeUsers = users.map((u) => u.toSafeObject());

    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      users: safeUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending user registration (Police/NGO)
// @route   PATCH /api/admin/users/:id/approve
// @access  Private (Admin only)
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    user.status = "approved";
    user.isVerified = true;
    user.isActive = true;
    user.rejectionReason = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} (${user.role.toUpperCase()}) approved successfully.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a pending user registration
// @route   PATCH /api/admin/users/:id/reject
// @access  Private (Admin only)
exports.rejectUser = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body || {};
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be rejected.",
        code: "ADMIN_MODIFICATION_FORBIDDEN"
      });
    }

    user.status = "rejected";
    user.isVerified = false;
    user.rejectionReason =
      (rejectionReason && rejectionReason.trim()) ||
      "Organization credentials could not be verified by platform administrators.";

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} has been rejected.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend a user account
// @route   PATCH /api/admin/users/:id/suspend
// @access  Private (Admin only)
exports.suspendUser = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    if (req.user && req.user._id && req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot suspend their own account.",
        code: "SELF_SUSPENSION_FORBIDDEN"
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be suspended.",
        code: "ADMIN_MODIFICATION_FORBIDDEN"
      });
    }

    user.status = "suspended";
    user.isActive = false;
    if (reason) {
      user.rejectionReason = reason;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} has been suspended.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivate a suspended user account
// @route   PATCH /api/admin/users/:id/activate
// @access  Private (Admin only)
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    user.status = user.role === "police" || user.role === "ngo" ? "approved" : "active";
    user.isActive = true;
    user.isVerified = true;
    user.rejectionReason = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Account for ${user.name} has been activated.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body || {};
    const validRoles = ["parent", "citizen", "police", "ngo", "admin"];

    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`,
        code: "INVALID_ROLE"
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    if (req.user && req.user._id && req.user._id.toString() === user._id.toString() && role.toLowerCase() !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot demote their own account.",
        code: "SELF_DEMOTION_FORBIDDEN"
      });
    }

    if (user.role === "admin" && role.toLowerCase() !== "admin") {
      return res.status(403).json({
        success: false,
        message: "System admin accounts cannot be demoted.",
        code: "ADMIN_DEMOTION_FORBIDDEN"
      });
    }

    user.role = role.toLowerCase();
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated to ${user.role}.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};
