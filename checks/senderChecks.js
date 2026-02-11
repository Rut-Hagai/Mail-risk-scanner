/**
 * checks/senderChecks.js
 *
 * Sender-related heuristics for email risk analysis.
 *
 * This module evaluates properties of the email sender (From / Reply-To)
 * and produces heuristic-based risk signals.
 *
 * Each heuristic emits a Signal with a weight and severity.
 * Signals are combined later by the scan service to compute
 * the final risk score and verdict.
 */

const { extractEmailAddress, getDomain } = require("../utils/email");

// Configuration / constants
const FREE_PROVIDERS = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"]);

const WEIGHT_FREE_PROVIDER = 8;
const WEIGHT_REPLYTO_MISMATCH = 18;
const WEIGHT_SUSPICIOUS_LOCALPART = 6;

const LOCALPART_DIGIT_THRESHOLD = 6;

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number} weight
 * @property {Object} evidence
 */

/**
 * Run sender-related heuristics and return risk signals.
 *
 * @param {Object} payload
 * @param {string} payload.from
 * @param {string} payload.replyTo
 * @returns {Signal[]} List of signals detected for the sender fields.
 */
function senderChecks(payload) {
    const signals = [];

    const fromAddr = extractEmailAddress(payload.from);
    const replyToAddr = extractEmailAddress(payload.replyTo);

    const fromDomain = getDomain(fromAddr);
    const replyToDomain = getDomain(replyToAddr);

    if (fromDomain && FREE_PROVIDERS.has(fromDomain)) {
        signals.push({
            id: "SENDER_FREE_PROVIDER",
            label: "Sender uses a free email provider",
            severity: "LOW",
            weight: WEIGHT_FREE_PROVIDER,
            evidence: { fromDomain }
        });
    }

    if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
        signals.push({
            id: "REPLYTO_MISMATCH",
            label: "Reply-To domain differs from From domain",
            severity: "MEDIUM",
            weight: WEIGHT_REPLYTO_MISMATCH,
            evidence: { fromDomain, replyToDomain }
        });
    }

    // suspicious local-part (many digits)
    if (fromAddr) {
        const local = fromAddr.split("@")[0] || "";
        const digitCount = (local.match(/\d/g) || []).length;

        if (digitCount >= LOCALPART_DIGIT_THRESHOLD) {
            signals.push({
                id: "SENDER_SUSPICIOUS_LOCALPART",
                label: "Sender local-part contains many digits",
                severity: "LOW",
                weight: WEIGHT_SUSPICIOUS_LOCALPART,
                evidence: { local }
            });
        }
    }

    return signals;
}

module.exports = { senderChecks };