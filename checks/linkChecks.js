/**
 * checks/linkChecks.js
 *
 * Link-based heuristics for email risk analysis.
 *
 * This module analyzes URLs found in the email and detects
 * suspicious link patterns commonly used in phishing attacks,
 * such as URL shorteners, raw IP addresses, and non-HTTPS links.
 *
 * Each detected pattern emits a heuristic Signal.
 * Signals are later aggregated by the scan service to compute
 * the final risk score and verdict.
 */

const { parseHostname, isIpHostname, isHttpNotHttps } = require("../utils/url");


const SHORTENERS = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly"
]);

const WEIGHT_LINK_SHORTENER = 18;
const WEIGHT_LINK_IP_ADDRESS = 25;
const WEIGHT_LINK_HTTP_NOT_HTTPS = 8;

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number} weight
 * @property {Object} evidence
 */

/**
 * Run link-based heuristics on email URLs.
 *
 * @param {Object} payload
 * @param {string[]} payload.links - List of URLs extracted from the email.
 * @returns {Signal[]} List of heuristic signals detected in the links.
 */
function linkChecks(payload) {
    const signals = [];
    const links = Array.isArray(payload.links) ? payload.links : [];

    for (const link of links) {
        const host = parseHostname(link);

        if (host && SHORTENERS.has(host)) {
            signals.push({
                id: "LINK_SHORTENER",
                label: "Link uses a URL shortener",
                severity: "MEDIUM",
                weight: WEIGHT_LINK_SHORTENER,
                evidence: { link, host }
            });
        }

        if (host && isIpHostname(host)) {
            signals.push({
                id: "LINK_IP_ADDRESS",
                label: "Link points to a raw IP address",
                severity: "HIGH",
                weight: WEIGHT_LINK_IP_ADDRESS,
                evidence: { link, host }
            });
        }

        if (isHttpNotHttps(link)) {
            signals.push({
                id: "LINK_HTTP_NOT_HTTPS",
                label: "Link is not HTTPS",
                severity: "LOW",
                weight: WEIGHT_LINK_HTTP_NOT_HTTPS,
                evidence: { link }
            });
        }
    }

    return signals;
}

module.exports = { linkChecks };
