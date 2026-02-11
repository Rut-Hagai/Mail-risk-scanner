/**
 * checks/contentChecks.js
 *
 * Content-based heuristics for email risk analysis.
 *
 * This module scans the email subject and body text for suspicious language patterns
 * commonly used in phishing/scam emails (urgency, credential requests, threats, money/invoices).
 *
 * Each detected pattern emits a heuristic Signal (id/label/severity/weight/evidence).
 * Signals are later aggregated by the scan service to compute the final risk score and verdict.
 */

const { containsAny, findMatches } = require("../utils/text");

const MAX_MATCHES_EVIDENCE = 10;

// Weights (risk contribution)
const WEIGHT_URGENCY = 15;
const WEIGHT_CREDENTIALS = 25;
const WEIGHT_MONEY = 12;
const WEIGHT_THREAT = 15;

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number} weight
 * @property {Object} evidence
 */

const GROUPS = [
    {
        id: "KEYWORDS_URGENCY",
        label: "Urgency / pressure language",
        severity: "MEDIUM",
        weight: WEIGHT_URGENCY,
        words: ["urgent", "immediately", "act now", "within 24 hours", "verify now", "asap"]
    },
    {
        id: "KEYWORDS_CREDENTIALS",
        label: "Credential / verification keywords",
        severity: "HIGH",
        weight: WEIGHT_CREDENTIALS,
        words: ["password", "login", "one-time code", "otp", "verification code", "credentials"]
    },
    {
        id: "KEYWORDS_MONEY",
        label: "Payment / invoice keywords",
        severity: "MEDIUM",
        weight: WEIGHT_MONEY,
        words: ["invoice", "payment", "wire", "transfer", "refund"]
    },
    {
        id: "KEYWORDS_THREAT",
        label: "Threat / account suspension language",
        severity: "MEDIUM",
        weight: WEIGHT_THREAT,
        words: ["account will be closed", "suspended", "locked", "disabled"]
    }
];

/**
 * Run content-based heuristics on email text.
 *
 * @param {Object} payload
 * @param {string} payload.subject - Email subject line.
 * @param {string} payload.bodyText - Plain text email body.
 * @returns {Signal[]} List of heuristic signals detected in the content.
 */
function contentChecks(payload) {
    const signals = [];

    // Normalize to lowercase once so matching is case-insensitive.
    const text = `${payload.subject || ""}\n${payload.bodyText || ""}`.toLowerCase();

    for (const g of GROUPS) {
        if (containsAny(text, g.words)) {
            signals.push({
                id: g.id,
                label: g.label,
                severity: g.severity,
                weight: g.weight,
                evidence: { matches: findMatches(text, g.words).slice(0, MAX_MATCHES_EVIDENCE) }
            });
        }
    }

    return signals;
}

module.exports = { contentChecks };
