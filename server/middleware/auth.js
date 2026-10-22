/**
 * GuardianLink — Authentication Middleware Alias
 *
 * Bridges require("../middleware/auth") to authenticate.js
 * Supports both default and destructured imports:
 *   const authenticate = require("./auth");
 *   const { authenticate } = require("./auth");
 */

const authenticate = require("./authenticate");

module.exports = authenticate;
module.exports.authenticate = authenticate;
