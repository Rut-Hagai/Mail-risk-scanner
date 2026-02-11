/**
 * services/urlscanClient.js
 *
 * Client for interacting with the urlscan.io API.
 *
 * This module is responsible only for:
 * - Submitting URLs for scanning
 * - Fetching scan results by UUID
 *
 * It does NOT make security decisions or compute scores.
 * All analysis is performed elsewhere in the system.
 */

const axios = require("axios");

// --------------------
// Configuration
// --------------------
const BASE_URL = "https://urlscan.io/api/v1";
const REQUEST_TIMEOUT_MS = 12000;

/**
 * Submit a URL for scanning via urlscan.io.
 *
 * Requires the environment variable URLSCAN_API_KEY to be set.
 * Optionally supports URLSCAN_VISIBILITY ("public" | "private" | "unlisted").
 *
 * @param {string} url - The URL to submit for scanning.
 * @returns {Promise<Object>} Raw response data from urlscan.io
 *   (typically includes uuid, task info, and result URL).
 */
async function submitUrlscan(url) {
    const apiKey = process.env.URLSCAN_API_KEY;
    if (!apiKey) throw new Error("Missing URLSCAN_API_KEY in environment");

    const visibility = process.env.URLSCAN_VISIBILITY || "public";

    const res = await axios.post(
        `${BASE_URL}/scan/`,
        { url, visibility },
        {
            headers: {
                "API-Key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: REQUEST_TIMEOUT_MS,
        }
    );

    return res.data;
}

/**
 * Fetch scan result JSON from urlscan.io by UUID.
 *
 * @param {string} uuid - UUID returned from submitUrlscan.
 * @returns {Promise<Object>} Scan result JSON including verdicts and metadata.
 */
async function fetchUrlscanResult(uuid) {
    const apiKey = process.env.URLSCAN_API_KEY;
    if (!apiKey) throw new Error("Missing URLSCAN_API_KEY in environment");

    const res = await axios.get(`${BASE_URL}/result/${uuid}/`, {
        headers: { "API-Key": apiKey },
        timeout: REQUEST_TIMEOUT_MS,
    });

    return res.data;
}

module.exports = { submitUrlscan, fetchUrlscanResult };

