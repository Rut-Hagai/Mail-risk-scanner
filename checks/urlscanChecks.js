/**
 * checks/urlscanChecks.js
 *
 * External reputation checks for URLs using urlscan.io.
 *
 * This module submits a small subset of extracted links to urlscan.io and
 * returns heuristic signals based on the returned verdicts.
 */

const { submitUrlscan, fetchUrlscanResult } = require("../services/urlscanClient");

const MAX_LINKS_TO_CHECK = 3;

const POLL_ATTEMPTS = 1;
const POLL_DELAY_MS = 0;

const WEIGHT_URLSCAN_MALICIOUS = 45;
const WEIGHT_URLSCAN_SUSPICIOUS = 20;

const SCORE_SUSPICIOUS_THRESHOLD = 1; // score > 0 indicates some suspicion

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number} weight
 * @property {string} category
 * @property {Object} evidence
 */

/**
 * Build a normalized Signal object for urlscan results.
 *
 * This helper centralizes signal creation to ensure a consistent structure:
 * fixed category ("urlscan"), numeric weight, and URL stored under evidence.link.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.label
 * @param {"LOW"|"MEDIUM"|"HIGH"} params.severity
 * @param {number|string} params.weight
 * @param {string} params.url
 * @param {Object} [params.evidenceExtra]
 * @returns {Signal}
 */
function makeSignal({ id, label, severity, weight, url, evidenceExtra = {} }) {
    return {
        id,
        label,
        severity,
        weight: Number(weight) || 0,
        category: "urlscan",
        // evidence.link enables aggregator dedupe by URL
        evidence: { link: url, ...evidenceExtra },
    };
}

/**
 * Poll urlscan.io for a result by UUID, with small bounded retries.
 *
 * @param {string} uuid
 * @param {Object} [options]
 * @param {number} [options.attempts]
 * @param {number} [options.delayMs]
 * @returns {Promise<Object|null>} Result JSON or null if not ready in time.
 */
async function pollForResult(uuid, { attempts = POLL_ATTEMPTS, delayMs = POLL_DELAY_MS } = {}) {
    for (let i = 0; i < attempts; i++) {
        try {
            const r = await fetchUrlscanResult(uuid);
            return r;
        } catch (e) {
            // Result not ready yet -> wait and retry
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return null;
}

/**
 * Run urlscan.io reputation checks on a small subset of extracted links.
 *
 * @param {Object} payload
 * @param {string[]} payload.links
 * @returns {Promise<Signal[]>} List of urlscan-derived signals.
 */
async function urlscanChecks(payload) {
    const links = Array.isArray(payload.links) ? payload.links : [];
    if (!links.length) return [];

    const signals = [];
    const toCheck = links.slice(0, MAX_LINKS_TO_CHECK);

    for (const url of toCheck) {
        try {
            const submitted = await submitUrlscan(url);

            // Typical response includes a uuid. Some responses include an "api" URL we can parse.
            const uuid = submitted.uuid || (submitted.api && String(submitted.api).split("/").pop());

            if (!uuid) {
                // Internal urlscan oddity – ignore for user-facing output
                continue;
            }

            const result = await pollForResult(uuid);

            const overall = result?.verdicts?.overall;

            if (!overall) {
                // Result not ready fast enough → do NOT show anything to the user
                continue;
            }

            const malicious = !!overall.malicious;
            const score = Number(overall.score || 0);
            const categories = overall.categories;
            const tags = overall.tags;

            if (malicious) {
                signals.push(
                    makeSignal({
                        id: "URLSCAN_MALICIOUS",
                        label: "urlscan: URL flagged as malicious",
                        severity: "HIGH",
                        weight: WEIGHT_URLSCAN_MALICIOUS,
                        url,
                        evidenceExtra: { uuid, score, categories, tags },
                    })
                );
            } else if (score >= SCORE_SUSPICIOUS_THRESHOLD || (Array.isArray(categories) && categories.length)) {
                signals.push(
                    makeSignal({
                        id: "URLSCAN_SUSPICIOUS",
                        label: "urlscan: URL has suspicious indicators",
                        severity: "MEDIUM",
                        weight: WEIGHT_URLSCAN_SUSPICIOUS,
                        url,
                        evidenceExtra: { uuid, score, categories, tags },
                    })
                );
            } else {
                signals.push(
                    makeSignal({
                        id: "URLSCAN_CLEAN",
                        label: "urlscan: no malicious verdicts",
                        severity: "LOW",
                        weight: 0,
                        url,
                        evidenceExtra: { uuid, score },
                    })
                );
            }
        } catch (err) {
            // External API error – log internally if needed, do not surface to user
            continue;
        }

    }

    return signals;
}

module.exports = { urlscanChecks };
