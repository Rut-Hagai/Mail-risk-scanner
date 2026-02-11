/**
 * checks/attachmentChecks.js
 *
 * Attachment-based heuristics for email risk analysis.
 *
 * This module analyzes email attachments and detects suspicious file types
 * and naming patterns commonly used in phishing and malware delivery campaigns.
 *
 * Detected patterns include executable files, archives, Office documents with macros,
 * and double file extensions (e.g. "invoice.pdf.exe").
 *
 * Each detected pattern emits a heuristic Signal.
 * Signals are later aggregated by the scan service to compute
 * the final risk score and verdict.
 */

const { getExt, hasDoubleExtension } = require("../utils/filename");

const EXEC_EXT = new Set(["exe", "js", "vbs", "scr", "bat", "cmd", "ps1", "msi"]);
const ARCHIVE_EXT = new Set(["zip", "rar", "7z"]);
const MACRO_EXT = new Set(["docm", "xlsm", "pptm"]);

const WEIGHT_EXECUTABLE = 30;
const WEIGHT_ARCHIVE = 18;
const WEIGHT_MACRO = 18;
const WEIGHT_DOUBLE_EXTENSION = 25;

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number} weight
 * @property {Object} evidence
 */


/**
 * Run attachment-based heuristics on email attachments.
 *
 * @param {Object} payload
 * @param {Array<{filename: string}>} payload.attachments
 * @returns {Signal[]} List of heuristic signals detected in attachments.
 */
function attachmentChecks(payload) {
    const signals = [];
    const atts = Array.isArray(payload.attachments) ? payload.attachments : [];

    for (const a of atts) {
        const filename = String(a.filename || "");
        const ext = getExt(filename);

        if (ext && EXEC_EXT.has(ext)) {
            signals.push({
                id: "ATTACHMENT_EXECUTABLE",
                label: "Attachment looks like an executable or script",
                severity: "HIGH",
                weight: WEIGHT_EXECUTABLE,
                evidence: { filename, ext }
            });
        }

        if (ext && ARCHIVE_EXT.has(ext)) {
            signals.push({
                id: "ATTACHMENT_ARCHIVE",
                label: "Attachment is an archive (zip/rar/7z)",
                severity: "MEDIUM",
                weight: WEIGHT_ARCHIVE,
                evidence: { filename, ext }
            });
        }

        if (ext && MACRO_EXT.has(ext)) {
            signals.push({
                id: "ATTACHMENT_MACRO_OFFICE",
                label: "Attachment may contain Office macros",
                severity: "MEDIUM",
                weight: WEIGHT_MACRO,
                evidence: { filename, ext }
            });
        }

        if (hasDoubleExtension(filename) && ext && EXEC_EXT.has(ext)) {
            signals.push({
                id: "ATTACHMENT_DOUBLE_EXTENSION",
                label: "Attachment has a double extension (common phishing trick)",
                severity: "HIGH",
                weight: WEIGHT_DOUBLE_EXTENSION,
                evidence: { filename }
            });
        }
    }

    return signals;
}

module.exports = { attachmentChecks };
