/**
 * GuardianLink — Admin Audit Log Client Service (Phase 11)
 *
 * Interacts with the authenticated Admin Audit Logs API:
 * GET /api/admin/audit-logs
 */

import api from "../lib/axios.js";

/**
 * Fetches paginated and filtered audit logs from the backend.
 *
 * @param {Object} params - Query parameters (page, limit, action, actorRole, outcome, search, from, to)
 * @returns {Promise<{ success: boolean, auditLogs: Array, pagination: Object }>}
 */
export const getAuditLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set("page", params.page);
  if (params.limit) queryParams.set("limit", params.limit);
  if (params.action && params.action !== "all" && params.action !== "All") {
    queryParams.set("action", params.action);
  }
  if (params.actorRole && params.actorRole !== "all" && params.actorRole !== "All") {
    queryParams.set("actorRole", params.actorRole.toLowerCase());
  }
  if (params.outcome && params.outcome !== "all" && params.outcome !== "All") {
    queryParams.set("outcome", params.outcome.toLowerCase());
  }
  if (params.entityType && params.entityType !== "all" && params.entityType !== "All") {
    queryParams.set("entityType", params.entityType);
  }
  if (params.search && params.search.trim()) {
    queryParams.set("search", params.search.trim());
  }
  if (params.from) queryParams.set("from", params.from);
  if (params.to) queryParams.set("to", params.to);

  const url = `/api/admin/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await api.get(url);
  return response.data;
};

export default {
  getAuditLogs
};
