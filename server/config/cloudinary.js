const https = require("https");
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");

// Ensure IPv4 connection for outbound HTTPS requests to prevent
// ENETUNREACH / ETIMEDOUT when running in Docker bridge networks with IPv6 / NAT64 DNS
if (!https.globalAgent || !https.globalAgent.options || https.globalAgent.options.family !== 4) {
  https.globalAgent = new https.Agent({ family: 4, keepAlive: true });
}

// Centralized Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Checks if Cloudinary credentials are configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Uploads an image buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {Object} options - Upload options (folder, childId, transformation)
 * @returns {Promise<{ photoUrl: string, cloudinaryPublicId: string, format: string, bytes: number, width: number, height: number }>}
 */
const uploadImage = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      const err = new Error("Cloudinary storage service is not configured.");
      err.code = "CLOUDINARY_NOT_CONFIGURED";
      err.status = 500;
      return reject(err);
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      const err = new Error("Invalid image buffer provided for upload.");
      err.code = "INVALID_IMAGE_BUFFER";
      err.status = 400;
      return reject(err);
    }

    const folder = options.folder || (options.childId ? `guardianlink/children/${options.childId}` : "guardianlink/children");

    const uploadOptions = {
      folder,
      resource_type: "image",
      transformation: [
        {
          width: 1000,
          height: 1000,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto"
        }
      ],
      ...options.cloudinaryOptions
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", error.message || error);
          const customError = new Error(error.message || "Failed to upload image to storage service.");
          customError.code = "CLOUDINARY_UPLOAD_FAILED";
          customError.status = 502;
          return reject(customError);
        }

        resolve({
          photoUrl: result.secure_url || result.url,
          cloudinaryPublicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height
        });
      }
    );

    const stream = Readable.from(buffer);
    stream.on("error", (err) => {
      reject(err);
    });
    stream.pipe(uploadStream);
  });
};

/**
 * Deletes an image asset from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<{ success: boolean, result: any }>}
 */
const deleteImage = async (publicId) => {
  if (!isConfigured()) {
    console.warn("Cloudinary not configured; skipping asset deletion:", publicId);
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    return { success: false, reason: "EMPTY_PUBLIC_ID" };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId.trim(), {
      resource_type: "image"
    });
    return {
      success: result.result === "ok",
      result: result.result
    };
  } catch (err) {
    console.error("Cloudinary delete failed for publicId:", publicId, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadImage,
  deleteImage
};
