/**
 * services/signalAggregator.js
 *
 * Aggregates duplicate signals that refer to the same entity
 * (e.g., same link or same IP) into a single signal.
 *
 * Goal:
 * - Prevent score inflation from repeated indicators
 * - Preserve explanation by keeping evidence.sources
 */

const DUPLICATE_WEIGHT_FACTOR = 0.5; // Add 50% of duplicate signal weight
const MAX_AGGREGATED_WEIGHT = 40;    // Cap aggregated weight per entity

const SEVERITY_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * @typedef {Object} Signal
 * @property {string} id
 * @property {string} label
 * @property {"LOW"|"MEDIUM"|"HIGH"} severity
 * @property {number|string} weight
 * @property {Object} [evidence]
 */

/**
 * Aggregate duplicate signals into a single signal per entity.
 *
 * Aggregation key priority:
 * 1) evidence.link
 * 2) evidence.ip
 * 3) id (fallback)
 *
 * Merge behavior:
 * - Weight increases moderately (DUPLICATE_WEIGHT_FACTOR) and is capped.
 * - Severity escalates to the higher level.
 * - evidence.sources tracks all contributing signal IDs.
 *
 * @param {Signal[]} signals
 * @returns {Signal[]} Aggregated signals.
 */
function aggregateSignals(signals) {
    const map = new Map();

    for (const signal of signals) {
        const link = signal.evidence?.link;
        const ip = signal.evidence?.ip;

        const key = link
            ? `link:${String(link)}`
            : ip
                ? `ip:${String(ip)}`
                : `id:${String(signal.id)}`;

        // First time we see this entity
        if (!map.has(key)) {
            map.set(key, {
                ...signal,
                weight: Number(signal.weight) || 0,
                evidence: {
                    ...(signal.evidence || {}),
                    sources: [signal.id]
                }
            });
            continue;
        }

        // Merge with existing signal
        const existing = map.get(key);

        const existingWeight = Number(existing.weight) || 0;
        const incomingWeight = Number(signal.weight) || 0;

        // Increase weight moderately (not full double), then cap
        existing.weight = Math.min(
            existingWeight + incomingWeight * DUPLICATE_WEIGHT_FACTOR,
            MAX_AGGREGATED_WEIGHT
        );

        // Escalate severity if needed
        existing.severity = maxSeverity(existing.severity, signal.severity);

        // Track all contributing signal IDs
        existing.evidence.sources.push(signal.id);
    }

    return Array.from(map.values());
}

/**
 * Return the higher severity between two severity levels.
 *
 * @param {"LOW"|"MEDIUM"|"HIGH"} a
 * @param {"LOW"|"MEDIUM"|"HIGH"} b
 * @returns {"LOW"|"MEDIUM"|"HIGH"}
 */
function maxSeverity(a, b) {
    const A = SEVERITY_ORDER[a] ?? 0;
    const B = SEVERITY_ORDER[b] ?? 0;
    return B > A ? b : a;
}

module.exports = { aggregateSignals };
