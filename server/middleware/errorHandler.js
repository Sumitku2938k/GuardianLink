/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error("❌ [SERVER ERROR]:", err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";
  let code = "SERVER_ERROR";

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `An account with this ${field} already exists.`;
    code = "DUPLICATE_KEY_ERROR";
  }

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(", ");
    code = "VALIDATION_ERROR";
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for field ${err.path}`;
    code = "CAST_ERROR";
  }

  // Handle JWT Verification Errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired authentication token.";
    code = "INVALID_TOKEN";
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    code: code,
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
};

module.exports = errorHandler;
