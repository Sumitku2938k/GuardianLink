const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient reference is required"],
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    recipientRole: {
      type: String,
      enum: ["police", "parent", "citizen", "admin", "ngo"],
      default: "police",
      index: true
    },
    type: {
      type: String,
      enum: {
        values: [
          "sighting_reported",
          "sighting_reviewed",
          "case_updated",
          "match_flagged",
          "system_alert",
          "care_intake",
          "care_status_updated",
          "handover_requested",
          "handover_approved",
          "handover_completed",
          "handover_rejected"
        ],
        message: "Invalid notification type"
      },
      required: [true, "Notification type is required"],
      index: true
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"]
    },
    data: {
      sightingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sighting",
        default: null
      },
      caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MissingCase",
        default: null
      },
      childId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Child",
        default: null
      },
      careRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CareRecord",
        default: null
      },
      handoverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Handover",
        default: null
      },
      shelterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shelter",
        default: null
      },
      caseNumber: {
        type: String,
        default: ""
      },
      reportNumber: {
        type: String,
        default: ""
      },
      locationSummary: {
        type: String,
        default: ""
      }
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveryStatus: {
      type: String,
      enum: ["created", "attempted", "confirmed", "failed"],
      default: "confirmed", // In-app notifications persist directly to database
      index: true
    },
    deliveryChannel: {
      type: String,
      enum: ["in_app", "email", "sms", "push"],
      default: "in_app"
    },
    deliveryError: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Targeted indexes for recipient inbox queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
