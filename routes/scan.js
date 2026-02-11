/**
 * routes/scan.js
 *
 * HTTP route layer for email scanning.
 * Validates and normalizes request payload and delegates processing
 * to the scan service.
 *
 * This layer contains no business logic.
 */

const express = require("express");
const { scanEmail } = require("../services/scanService");

const router = express.Router();


 // POST /scan
 // Accepts email metadata and content, normalizes the input,
 // and returns the scan result.
router.post("/scan", async (req, res) => {

    const payload = req.body || {};

    // Minimal validation (MVP)
    const normalized = {
        messageId: String(payload.messageId || ""),
        from: String(payload.from || ""),
        replyTo: String(payload.replyTo || ""),
        subject: String(payload.subject || ""),
        bodyText: String(payload.bodyText || ""),
        links: Array.isArray(payload.links) ? payload.links.map(String) : [],
        attachments: Array.isArray(payload.attachments) ? payload.attachments : []
    };

    const result = await scanEmail(normalized);
    return res.json(result);
});

module.exports = router;
