/**
 * utils/url.js
 *
 * URL parsing and analysis utilities.
 *
 * This module provides small helper functions for extracting
 * and analyzing URL components used by link-based heuristics.
 *
 */

/**
 * Extract the hostname (domain or IP) from a URL string.
 *
 * Examples:
 * - "https://example.com/path" -> "example.com"
 * - "http://1.2.3.4/login"     -> "1.2.3.4"
 *
 * @param {string} url - URL string to parse.
 * @returns {string} Lowercase hostname, or empty string if parsing fails.
 */
function parseHostname(url) {
    try {
        const u = new URL(String(url));
        return (u.hostname || "").toLowerCase();
    } catch {
        return "";
    }
}

/**
 * Check whether a hostname represents a raw IPv4 address.
 *
 * @param {string} host - Hostname extracted from a URL.
 * @returns {boolean} True if the host looks like an IPv4 address.
 */
function isIpHostname(host) {
    // Very simple IPv4 detection (heuristic)
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(String(host));
}

/**
 * Check whether a URL uses HTTP instead of HTTPS.
 *
 * @param {string} url - URL string to inspect.
 * @returns {boolean} True if the URL starts with "http://".
 */
function isHttpNotHttps(url) {
    return /^http:\/\//i.test(String(url));
}

module.exports = { parseHostname, isIpHostname, isHttpNotHttps };
