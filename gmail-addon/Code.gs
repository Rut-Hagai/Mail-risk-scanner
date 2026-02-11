/**
 * Gmail Add-on entry point.
 * Runs whenever the user opens an email.
 *
 * Responsibilities:
 * - Read the current Gmail message by messageId
 * - Extract a normalized payload (headers/body/links/attachments metadata)
 * - Call the backend /scan endpoint
 * - Render the result as a Gmail Add-on Card
 */
function buildAddOn(e) {
  var msgId = e.gmail && e.gmail.messageId;
  if (!msgId) {
    return buildErrorCard_("No messageId found in trigger event.");
  }

  var gmailMessage = GmailApp.getMessageById(msgId);

  // Extract email fields
  var payload = {
    messageId: msgId,
    from: gmailMessage.getFrom() || "",
    replyTo: gmailMessage.getReplyTo() || "",
    subject: gmailMessage.getSubject() || "",
    bodyText: gmailMessage.getPlainBody() || "",
    links: extractLinks_(gmailMessage.getPlainBody()),
    attachments: extractAttachmentsMeta_(gmailMessage)
  };

  // Call backend
  var result;
  try {
    result = callBackendScan_(payload);
  } catch (err) {
    return buildErrorCard_(String(err));
  }

  return buildResultCard_(result, payload);
}

/**
 * Call the backend /scan endpoint with a normalized payload.
 *
 * Reads BACKEND_BASE_URL from Script Properties and performs an HTTP POST.
 *
 * @param {Object} payload - Normalized email payload.
 * @returns {Object} Parsed JSON response from the backend.
 * @throws {Error} If BACKEND_BASE_URL is missing, HTTP status is not 2xx,
 *                 or the response is not valid JSON.
 */
function callBackendScan_(payload) {
  var baseUrl =
    PropertiesService.getScriptProperties().getProperty("BACKEND_BASE_URL");

  if (!baseUrl) {
    throw new Error("Missing Script Property BACKEND_BASE_URL");
  }

  var url = baseUrl.replace(/\/$/, "") + "/scan";

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch(url, options);
  var text = res.getContentText();
  var code = res.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error("Backend error: HTTP " + code + " - " + text);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Backend returned non-JSON response: " + text);
  }
}

/**
 * Build the Gmail Add-on card that shows the scan result.
 *
 * @param {Object} result - Backend scan result { verdict, score, summary, signals }.
 * @param {Object} payload - Original normalized payload (for snapshot display).
 * @returns {Card} Gmail Card to render.
 */
function buildResultCard_(result, payload) {
  function verdictIcon_(v) {
    if (v === "DANGEROUS") return "🚨";
    if (v === "SUSPICIOUS") return "⚠️";
    return "✅";
  }

  function severityIcon_(s) {
    if (s === "HIGH") return "🚨";
    if (s === "MEDIUM") return "⚠️";
    return "ℹ️";
  }

  var verdict = String((result && result.verdict) || "N/A");
  var score = Number((result && result.score) || 0);
  var summary = String((result && result.summary) || "No summary.");

  var header = CardService.newCardHeader()
    .setTitle("Mail Risk Scanner")
    .setSubtitle("Scan result");

  var section = CardService.newCardSection();

  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Verdict")
    .setContent(verdictIcon_(verdict) + " " + verdict));

  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Score")
    .setContent(String(score)));

  section.addWidget(CardService.newTextParagraph()
    .setText(sanitize_(summary)));

  // Signals (top 6)
  var signals = (result && Array.isArray(result.signals)) ? result.signals : [];

  // Hide noisy internal statuses (optional)
  signals = signals.filter(function (s) {
    var id = String((s && s.id) || "");
    return id !== "URLSCAN_PENDING" && id !== "URLSCAN_ERROR";
  });

  if (signals.length) {
    signals.sort(function (a, b) {
      return (Number(b.weight) || 0) - (Number(a.weight) || 0);
    });

    var lines = signals.slice(0, 6).map(function (s) {
      var label = String(s.label || "Signal");
      var weight = Number(s.weight) || 0;
      var sev = String(s.severity || "LOW");
      return "• " + severityIcon_(sev) + " " + sanitize_(label) + " (+" + weight + ")";
    }).join("<br/>");

    section.addWidget(CardService.newTextParagraph()
      .setText("<b>Signals</b><br/>" + lines));
  }

  // Quick snapshot
  var from = payload && payload.from ? String(payload.from) : "";
  var subject = payload && payload.subject ? String(payload.subject) : "";
  var linksCount = payload && Array.isArray(payload.links) ? payload.links.length : 0;
  var attCount = payload && Array.isArray(payload.attachments) ? payload.attachments.length : 0;

  section.addWidget(CardService.newTextParagraph().setText(
    "<b>From:</b> " + sanitize_(from) + "<br/>" +
    "<b>Subject:</b> " + sanitize_(subject) + "<br/>" +
    "<b>Links:</b> " + linksCount + "<br/>" +
    "<b>Attachments:</b> " + attCount
  ));

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}

/**
 * Build an error card.
 *
 * @param {string} msg - Error message to display.
 * @returns {Card} Gmail Card to render.
 */
function buildErrorCard_(msg) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Mail Risk Scanner"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph()
          .setText("<b>Error:</b><br/>" + sanitize_(msg))
      )
    )
    .build();
}

/**
 * Extract URLs from plain text.
 *
 * @param {string} text
 * @returns {string[]} List of extracted URLs.
 */
function extractLinks_(text) {
  if (!text) return [];
  var regex = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
  var matches = text.match(regex) || [];
  return matches.map(function (u) {
    return u.replace(/[),.;!?]+$/, "");
  });
}

/**
 * Extract attachments metadata from GmailMessage.
 * NOTE: Metadata only (no file upload).
 *
 * @param {GmailMessage} gmailMessage
 * @returns {Array<{filename:string, mimeType:string, sizeBytes:number}>}
 */
function extractAttachmentsMeta_(gmailMessage) {
  var atts = gmailMessage.getAttachments({ includeInlineImages: false }) || [];
  return atts.map(function (a) {
    return {
      filename: a.getName() || "unknown",
      mimeType: a.getContentType() || "application/octet-stream",
      sizeBytes: a.getBytes().length
    };
  });
}

/**
 * Minimal HTML escaping for safe card rendering.
 *
 * @param {any} s
 * @returns {string}
 */
function sanitize_(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}



