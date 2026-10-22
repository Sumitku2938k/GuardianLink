/**
 * GuardianLink — Role Authorization Middleware
 *
 * Enforces role-based access control (RBAC) across protected routes.
 * Supports both variadic arguments and array syntax:
 *   requireRole("ngo", "admin")
 *   requireRole(["ngo", "admin"])
 *
 * Also provides account verification checks for sensitive operational roles.
 */

const requireRole = (...roles) => {
  // Normalize roles: flatten nested arrays and ensure strings
  const allowedRoles = roles.flat(Infinity);

  return (req, res, next) => {
    // 1. Authentication check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role check.",
        code: "UNAUTHORIZED"
      });
    }

    // 2. Role authorization check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        code: "FORBIDDEN_ROLE"
      });
    }

    next();
  };
};

/**
 * Optional middleware helper to enforce both role and approved status
 */
const requireApprovedRole = (...roles) => {
  const allowedRoles = roles.flat(Infinity);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role check.",
        code: "UNAUTHORIZED"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        code: "FORBIDDEN_ROLE"
      });
    }

    if (req.user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Account is awaiting administrative verification before accessing operational resources.",
        code: "ACCOUNT_VERIFICATION_PENDING"
      });
    }

    next();
  };
};

// Support both `const { requireRole } = require(...)` and `const requireRole = require(...)`
module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.requireApprovedRole = requireApprovedRole;
module.exports.authorize = requireRole;
