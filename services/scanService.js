/**
 * services/scanService.js
 *
 * Orchestrates all email risk checks and computes the final score and verdict.
 */

const { senderChecks } = require("../checks/senderChecks");
const { contentChecks } = require("../checks/contentChecks");
const { linkChecks } = require("../checks/linkChecks");
const { attachmentChecks } = require("../checks/attachmentChecks");
const { aggregateSignals } = require("./signalAggregator");
const { urlscanChecks } = require("../checks/urlscanChecks");



const SCORE_MIN = 0;
const SCORE_MAX = 100;

const SUSPICIOUS_THRESHOLD = 25;
const DANGEROUS_THRESHOLD = 60;

const SUMMARY_TOP_SIGNALS_LIMIT = 3;

const HIGH_SEVERITY_SCORE_FLOOR = 40;

/**
 * @typedef {Object} Signal
 * @property {string} label - Human-readable indicator name.
 * @property {number|string} weight - Score contribution (will be coerced to number).
 * @property {string} [category] - Optional category (e.g., "sender", "content").
 * @property {any} [meta] - Optional extra data for debugging/UI.
 */


/**
 * Check whether any signal has HIGH severity.
 *
 * @param {Signal[]} signals
 * @returns {boolean}
 */
function hasHighSeverity(signals) {
    return signals.some((s) => s.severity === "HIGH");
}

/**
 * Clamp a number into an inclusive range.
 *
 * @param {number} n - The input number.
 * @param {number} min - Lower bound (inclusive).
 * @param {number} max - Upper bound (inclusive).
 * @returns {number} The clamped number between min and max.
 */
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Convert a numeric score into a readable verdict.
 *
 * @param {number} score - Risk score (0-100).
 * @returns {"SAFE"|"SUSPICIOUS"|"DANGEROUS"} The computed verdict.
 */
function computeVerdict(score) {
    if (score >= DANGEROUS_THRESHOLD) return "DANGEROUS";
    if (score >= SUSPICIOUS_THRESHOLD) return "SUSPICIOUS";
    return "SAFE";
}

/**
 * Build a short summary string for the scan result.
 *
 * @param {"SAFE"|"SUSPICIOUS"|"DANGEROUS"} verdict - The computed verdict.
 * @param {Signal[]} topSignals - Signals sorted by weight descending.
 * @returns {string} A concise explanation string for the verdict.
 */
function buildSummary(verdict, topSignals) {
    if (!topSignals.length) return "No suspicious indicators found.";

    // Mention only the top contributing indicators to keep the message concise.
    const reasons = topSignals.slice(0, SUMMARY_TOP_SIGNALS_LIMIT).map(s => s.label).join("; ");
    return `${verdict} based on: ${reasons}`;
}

/**
 * Execute a promise with a time limit.
 *
 * Returns the promise result if it resolves within the given timeout,
 * otherwise returns an empty array. Errors are swallowed by design.
 *
 * @param {Promise<any>} promise - The async operation to execute.
 * @param {number} ms - Timeout in milliseconds.
 * @returns {Promise<any[]>} Promise result or empty array on timeout/error.
 */
async function withTimeout(promise, ms) {
    return Promise.race([
        promise.catch(() => []),
        new Promise((resolve) => setTimeout(() => resolve([]), ms)),
    ]);
}


/**
 * Run all checks on an email payload, compute a risk score, and return the final decision.
 *
 * @param {Object} payload - Normalized email payload.
 * @param {string} payload.messageId - Email message identifier.
 * @param {string} payload.from - Sender email/address.
 * @param {string} payload.replyTo - Reply-To email/address.
 * @param {string} payload.subject - Email subject.
 * @param {string} payload.bodyText - Plain text body content.
 * @param {string[]} payload.links - Extracted URLs found in the email.
 * @param {any[]} payload.attachments - Attachments metadata.
 * @returns {{score:number, verdict:"SAFE"|"SUSPICIOUS"|"DANGEROUS", summary:string, signals:Signal[]}}
 *   Scan result containing the bounded score, verdict, summary, and all contributing signals.
 */
async function scanEmail(payload) {
    const signals = [
        ...senderChecks(payload),
        ...contentChecks(payload),
        ...linkChecks(payload),
        ...attachmentChecks(payload),
        ...(await withTimeout(urlscanChecks(payload), 2000)),
    ];

    const aggregatedSignals = aggregateSignals(signals);

    let scoreRaw = aggregatedSignals.reduce(
        (sum, s) => sum + (Number(s.weight) || 0),
        0
    );

    // If there is at least one HIGH-severity indicator, enforce a minimum score.
    // This prevents severe indicators from looking "weak" due to aggregation or weighting.
    if (hasHighSeverity(aggregatedSignals)) {
        scoreRaw = Math.max(scoreRaw, HIGH_SEVERITY_SCORE_FLOOR);
    }


    const score = clamp(scoreRaw, SCORE_MIN, SCORE_MAX);
    const verdict = computeVerdict(score);

    // Sort a copy for summary purposes without mutating the original signals order.
    const topSignals = [...aggregatedSignals].sort(
        (a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0)
    );

    const summary = buildSummary(verdict, topSignals);

    return { score, verdict, summary, signals: aggregatedSignals };
}

module.exports = { scanEmail };
