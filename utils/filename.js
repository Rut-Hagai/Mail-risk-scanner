/**
 * utils/filename.js
 *
 * Filename parsing utilities.
 *
 * This module provides small helper functions for extracting and analyzing
 * file extensions from attachment filenames.
 *
 */

/**
 * Extract the file extension from a filename.
 *
 * Examples:
 * - "invoice.pdf"      -> "pdf"
 * - "invoice.PDF.exe"  -> "exe"
 * - "no_extension"     -> ""
 *
 * @param {string} filename
 * @returns {string} Lowercase file extension, or empty string if none.
 */
function getExt(filename) {
    const parts = String(filename || "").toLowerCase().split(".");
    if (parts.length < 2) return "";
    return parts[parts.length - 1];
}

/**
 * Check whether a filename has a double extension
 * (e.g. "invoice.pdf.exe").
 *
 * @param {string} filename
 * @returns {boolean}
 */
function hasDoubleExtension(filename) {
    const parts = String(filename || "").toLowerCase().split(".");
    return parts.length >= 3; // e.g. invoice.pdf.exe
}

module.exports = { getExt, hasDoubleExtension };
