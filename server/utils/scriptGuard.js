/**
 * GuardianLink — Script Execution Environment Guard
 * Phase 17: Data Integrity & Production Safety
 *
 * Enforces fail-closed protection against accidental execution of test, seed,
 * or fixture cleanup scripts in production environments.
 */

const { isProduction } = require("../config/envValidator");

/**
 * Asserts that the executing script is running in a non-production environment.
 * Terminates process immediately if NODE_ENV=production.
 *
 * @param {string} scriptPath - The __filename or identifier of the script
 */
function assertNonProductionScript(scriptPath) {
  if (isProduction()) {
    const scriptName = scriptPath ? scriptPath.split(/[/\\]/).pop() : "Script";
    console.error(`\n❌ [SECURITY REJECTION] Execution of script '${scriptName}' is strictly prohibited in production mode.`);
    console.error("❌ Refusing to run development/test fixture operations on production database.\n");
    process.exit(1);
  }
}

module.exports = {
  assertNonProductionScript
};

