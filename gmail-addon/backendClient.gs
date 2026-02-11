/**
 * Call the backend email scan API.
 *
 * Sends a normalized email payload to the external backend
 * and returns the parsed scan result.
 *
 * This function acts as a thin communication layer between
 * the Gmail Add-on (Apps Script) and the backend service.
 *
 * @param {Object} payload - Normalized email data extracted from Gmail.
 * @returns {Object} Parsed JSON response from the backend scan endpoint.
 */
function callBackendScan(payload) {
  var baseUrl = "https://ida-nonjudicable-overfly.ngrok-free.dev";
  var url = baseUrl + "/scan";

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}


