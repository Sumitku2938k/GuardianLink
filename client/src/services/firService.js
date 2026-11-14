/**
 * GuardianLink — FIR Service (Frontend) (Phase 18)
 *
 * Dedicated client-side service for FIR management:
 * - Parent FIR filing with multipart document upload
 * - Parent FIR document replacement/resubmission
 * - Police verification & rejection workflows
 * - Secure document streaming, preview blob loading, and file downloads
 * - Case-scoped and pending queue queries
 */

import api from "../lib/axios.js";

/**
 * Submit official FIR with attached document for a missing case
 * @param {string} caseId
 * @param {FormData} formData
 * @returns {Promise<Object>}
 */
export const submitFIR = async (caseId, formData) => {
  const response = await api.post(`/api/firs/${caseId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data?.data;
};

/**
 * Replace / resubmit an FIR document with a newer version
 * @param {string} firId
 * @param {FormData} formData
 * @returns {Promise<Object>}
 */
export const replaceFIRDocument = async (firId, formData) => {
  const response = await api.post(`/api/firs/${firId}/documents/replace`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data?.data;
};

/**
 * Fetch official FIR details for a specific missing case
 * @param {string} caseId
 * @returns {Promise<Object|null>}
 */
export const getCaseFIR = async (caseId) => {
  try {
    const response = await api.get(`/api/firs/case/${caseId}`);
    return response.data?.data || null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Fetch FIR details by FIR ID
 * @param {string} firId
 * @returns {Promise<Object>}
 */
export const getFIRById = async (firId) => {
  const response = await api.get(`/api/firs/${firId}`);
  return response.data?.data;
};

/**
 * Fetch pending FIR reviews (Police and Admin only)
 * @param {Object} [params]
 * @returns {Promise<{ firs: Array, pagination: Object }>}
 */
export const getPendingFIRs = async (params = {}) => {
  const response = await api.get("/api/firs/pending", { params });
  return {
    firs: response.data?.data || [],
    pagination: response.data?.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 }
  };
};

/**
 * Verify an FIR (Police or Admin)
 * @param {string} firId
 * @param {Object} data { reviewNotes: string }
 * @returns {Promise<Object>}
 */
export const verifyFIR = async (firId, { reviewNotes }) => {
  const response = await api.patch(`/api/firs/${firId}/verify`, { reviewNotes });
  return response.data?.data;
};

/**
 * Reject an FIR with mandatory reason and review notes (Police or Admin)
 * @param {string} firId
 * @param {Object} data { reviewNotes: string, rejectionReason: string }
 * @returns {Promise<Object>}
 */
export const rejectFIR = async (firId, { reviewNotes, rejectionReason }) => {
  const response = await api.patch(`/api/firs/${firId}/reject`, { reviewNotes, rejectionReason });
  return response.data?.data;
};

/**
 * Fetch document blob for secure inline preview (uses authenticated session)
 * @param {string} firId
 * @param {number|string} [version="latest"]
 * @returns {Promise<{ blob: Blob, objectUrl: string, mimeType: string }>}
 */
export const fetchDocumentPreviewBlob = async (firId, version = "latest") => {
  const response = await api.get(`/api/firs/${firId}/documents/${version}/preview`, {
    responseType: "blob"
  });

  const mimeType = response.headers["content-type"] || "application/pdf";
  const blob = new Blob([response.data], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  return { blob, objectUrl, mimeType };
};

/**
 * Download FIR document securely through authenticated session
 * @param {string} firId
 * @param {number|string} [version="latest"]
 * @param {string} [suggestedFilename="FIR_Document"]
 */
export const downloadFIRDocument = async (firId, version = "latest", suggestedFilename = "FIR_Document") => {
  const response = await api.get(`/api/firs/${firId}/documents/${version}/download`, {
    responseType: "blob"
  });

  const mimeType = response.headers["content-type"] || "application/octet-stream";
  const blob = new Blob([response.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", suggestedFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  submitFIR,
  replaceFIRDocument,
  getCaseFIR,
  getFIRById,
  getPendingFIRs,
  verifyFIR,
  rejectFIR,
  fetchDocumentPreviewBlob,
  downloadFIRDocument
};

