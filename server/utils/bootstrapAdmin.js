const User = require("../models/User");

/**
 * Bootstrap an internal Administrator account on system startup if one does not exist.
 * Uses environment variables: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE
 */
const bootstrapAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@guardianlink.local";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "GuardianLink Administrator";
    const adminPhone = process.env.ADMIN_PHONE || "9999900000";

    // 1. Check if any admin account already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log(`🛡️  Admin account exists (${existingAdmin.email}) - bootstrap skipped.`);
      return;
    }

    // 2. Also check if the designated email or phone is already taken
    const existingEmail = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (existingEmail) {
      console.log(`⚠️  User with email ${adminEmail} already exists. Skipping bootstrap.`);
      return;
    }

    const existingPhone = await User.findOne({ phone: adminPhone.trim() });
    if (existingPhone) {
      console.log(`⚠️  User with phone ${adminPhone} already exists. Skipping bootstrap.`);
      return;
    }

    if (!adminPassword) {
      console.warn("⚠️  ADMIN_PASSWORD environment variable not set. Admin bootstrap skipped.");
      return;
    }

    // 3. Create the administrator account
    // Note: User.pre('save') handles bcrypt hashing for passwordHash
    const admin = new User({
      name: adminName.trim(),
      email: adminEmail.toLowerCase().trim(),
      phone: adminPhone.trim(),
      passwordHash: adminPassword,
      role: "admin",
      status: "active",
      isVerified: true,
      isActive: true,
      city: "HQ",
      state: "Central"
    });

    await admin.save();
    console.log(`🛡️  Administrator account created successfully: ${admin.email}`);
  } catch (error) {
    console.error("❌ Error bootstrapping Admin account:", error.message);
  }
};

module.exports = bootstrapAdmin;
