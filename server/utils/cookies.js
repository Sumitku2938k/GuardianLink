const jwt = require("jsonwebtoken");
const { setSession } = require("../config/redis");

const COOKIE_NAME = "guardianlink_token";

const sendTokenResponse = async (user, statusCode, res) => {
  const safeUser = user.toSafeObject();

  // Create JWT Payload
  const payload = {
    id: safeUser.id,
    role: safeUser.role,
    email: safeUser.email
  };

  const secret = process.env.JWT_SECRET || "guardianlink_super_secret_jwt_key_2026_safe_child_platform";

  // Sign Token
  const token = jwt.sign(payload, secret, {
    expiresIn: "7d"
  });

  // Save session info to Redis/Session store
  await setSession(`session:${safeUser.id}`, {
    userId: safeUser.id,
    role: safeUser.role,
    token: token,
    lastActive: new Date().toISOString()
  }, 7 * 24 * 60 * 60);

  // Cookie Options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };

  res
    .status(statusCode)
    .cookie(COOKIE_NAME, token, cookieOptions)
    .json({
      success: true,
      user: safeUser
    });
};

const clearTokenCookie = (res) => {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };

  res.clearCookie(COOKIE_NAME, clearOptions);
  res.cookie(COOKIE_NAME, "", {
    ...clearOptions,
    expires: new Date(0)
  });
};

module.exports = {
  COOKIE_NAME,
  sendTokenResponse,
  clearTokenCookie
};
