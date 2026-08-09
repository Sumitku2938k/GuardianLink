/**
 * Root route controller
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.getWelcome = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the GuardianLink AI Child Safety & Emergency Response Platform API",
    version: "1.0.0",
    status: "Active"
  });
};
