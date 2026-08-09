/**
 * Health check controller
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
    uptime: process.uptime()
  });
};
