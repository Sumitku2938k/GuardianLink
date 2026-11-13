/**
 * GuardianLink — Development Database Seeding Script
 * Phase 17: Environment-Isolated Development Seeder
 *
 * Populates sample development records only in local development or test mode.
 * Strictly forbidden from executing in production.
 */

const mongoose = require("mongoose");
const { assertNonProductionScript } = require("../utils/scriptGuard");

// Enforce environment guard immediately
assertNonProductionScript(__filename);

if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run seed script in production mode.");
  process.exit(1);
}

const runSeeder = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/guardianlink_dev";

  if (mongoUri.includes("prod") || mongoUri.includes("atlas") || mongoUri.includes("production")) {
    console.error("❌ Refusing to seed database with URI indicating production cluster:", mongoUri);
    process.exit(1);
  }

  console.log("🌱 GuardianLink Development Seeder ready. (Environment: development)");
};

if (require.main === module) {
  runSeeder();
}

module.exports = { runSeeder };

