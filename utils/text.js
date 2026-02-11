/**
 * utils/text.js
 *
 * Text analysis utility functions.
 *
 * This module provides small helper functions for simple, heuristic-based
 * phrase matching in text.
 *
 * These utilities are intended to keep the heuristics readable and reusable
 * in the checks layer (e.g., contentChecks).
 */

/**
 * Check whether the given text contains at least one of the provided phrases.
 *
 *
 * @param {string} text - The text to scan.
 * @param {string[]} phrases - List of words or phrases to look for.
 * @returns {boolean} True if any phrase is found in the text; otherwise false.
 */
function containsAny(text, phrases) {
    return phrases.some(p => text.includes(String(p).toLowerCase()));
}

/**
 * Return all phrases from the provided list that appear in the given text.
 *
 *
 * @param {string} text - The text to scan.
 * @param {string[]} phrases - List of words or phrases to match.
 * @returns {string[]} List of phrases that were found in the text.
 */
function findMatches(text, phrases) {
    const hits = [];

    for (const p of phrases) {
        const q = String(p).toLowerCase();
        if (text.includes(q)) hits.push(p);
    }

    return hits;
}

module.exports = { containsAny, findMatches };
