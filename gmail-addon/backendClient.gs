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
  const baseUrl = PropertiesService.getScriptProperties().getProperty("BACKEND_BASE_URL");

  if (!baseUrl) {
    throw new Error("Configuration Error: BACKEND_BASE_URL is not set in Script Properties.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/scan`;

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

//Perform the request
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  //Handle HTTP Errors (e.g., 404, 500)
  if (responseCode < 200 || responseCode >= 300) {
    console.error(`Backend Error (${responseCode}): ${responseText}`);
    throw new Error(`Scan failed with status ${responseCode}. Please try again later.`);
  }

  //Safe Parse
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse JSON response:", responseText);
    throw new Error("Invalid response format from server.");
  }
}
