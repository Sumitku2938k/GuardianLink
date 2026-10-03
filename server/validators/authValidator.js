const validateRegisterInput = (req, res, next) => {
  const { fullName, email, phone, password, role } = req.body;

  const errors = [];

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    errors.push("Full name is required");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email address is required");
  }

  if (!phone || !phone.trim() || phone.trim().length < 8) {
    errors.push("A valid phone number is required (at least 8 digits)");
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  const validRoles = ["parent", "citizen", "police", "ngo"];
  if (role) {
    const normalizedRole = role.toLowerCase().trim();
    if (normalizedRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrator accounts cannot be created via public registration.",
        code: "ADMIN_REGISTRATION_FORBIDDEN"
      });
    }
    if (!validRoles.includes(normalizedRole)) {
      errors.push(`Invalid role specified. Must be one of: ${validRoles.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors: errors,
      code: "VALIDATION_ERROR"
    });
  }

  next();
};

const validateLoginInput = (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !identifier.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter your registered email address or phone number",
      code: "MISSING_IDENTIFIER"
    });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter your password",
      code: "MISSING_PASSWORD"
    });
  }

  next();
};

module.exports = {
  validateRegisterInput,
  validateLoginInput
};
