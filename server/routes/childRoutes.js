const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { uploadPhoto } = require("../middleware/upload");
const {
  createChild,
  getChildren,
  getChildById,
  updateChild,
  updateChildPhoto,
  deleteChildPhoto,
  updateChildStatus,
  retryBiometricEnrollment
} = require("../controllers/childController");

// All child management operations are restricted to authenticated Parents
router.use(authenticate, authorize("parent"));

router
  .route("/")
  .post(uploadPhoto, createChild)
  .get(getChildren);

router
  .route("/:id")
  .get(getChildById)
  .patch(uploadPhoto, updateChild);

router
  .route("/:id/photo")
  .patch(uploadPhoto, updateChildPhoto)
  .delete(deleteChildPhoto);

router
  .route("/:id/status")
  .patch(updateChildStatus);

router
  .route("/:id/enroll-biometric")
  .post(retryBiometricEnrollment);

module.exports = router;
