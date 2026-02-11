/**
 * utils/email.js
 *
 * Email parsing utilities.
 *
 * This module provides small helper functions for extracting and normalizing
 * email addresses and domains from raw email header values (e.g., From/Reply-To).
 */

/**
 * Extract an email address from a raw header string.
 *
 * Supports common formats like:
 * - "Name <user@example.com>"
 * - "user@example.com"
 *
 * If no email-like token is found, returns an empty string.
 *
 * @param {string} raw - Raw email header value (may be null/undefined/any type).
 * @returns {string} Normalized email address (lowercase), or "" if none found.
 */
function extractEmailAddress(raw) {
    if (!raw) return "";
    const s = String(raw);

    // Match <email@domain> (capture only the inside part via parentheses)
    const m = s.match(/<([^>]+@[^>]+)>/);
    if (m && m[1]) return m[1].trim().toLowerCase();

    // Fallback: find the first email-like token anywhere in the string
    const m2 = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return m2 ? m2[0].trim().toLowerCase() : "";
}

/**
 * Extract the domain part from an email address.
 *
 * Example:
 * - "user@example.com" -> "example.com"
 *
 * @param {string} email - Email address string.
 * @returns {string} Domain part (lowercase), or "" if input is invalid.
 */
function getDomain(email) {
    if (!email || !email.includes("@")) return "";
    return String(email).split("@")[1].toLowerCase();
}

module.exports = { extractEmailAddress, getDomain };






