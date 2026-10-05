const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createChild,
  getChildren,
  getChildById,
  updateChild,
  updateChildStatus
} = require("../controllers/childController");

// All child management operations are restricted to authenticated Parents
router.use(authenticate, authorize("parent"));

router
  .route("/")
  .post(createChild)
  .get(getChildren);

router
  .route("/:id")
  .get(getChildById)
  .patch(updateChild);

router
  .route("/:id/status")
  .patch(updateChildStatus);

module.exports = router;
