# Mail Risk Scanner 🛡️

**Upwind Student Program - Home Task**

 
🧭 Table of Contents

<details>
<summary>🧭 Table of Contents (click to expand)</summary>

* [📘 About the Project](#-about-the-project)
* [🏗️ Architecture](#-architecture)
* [🔧 Project Structure](#-project-structure)
* [✨ Features](#-features)
* [📡 APIs & Interfaces](#-apis--interfaces)
* [⚙️ Getting Started](#-getting-started)
    * [✔️ Prerequisites](#-prerequisites)
    * [📦 Installation & Setup (Backend)](#-installation--setup-backend)
    * [📧 Setup (Gmail Add-on)](#-setup-gmail-add-on)
* [▶️ Usage](#-usage)
* [🧩 Example Output](#-example-output)
* [⚠️ Limitations & Constraints](#-limitations--constraints)
* [👩‍💻 Author](#-author)

</details>

---

## 📘 About the Project

This project was developed as part of the **Upwind Student Program Home Task**.
It is a comprehensive security tool designed to analyze incoming emails in **Gmail** and detect potential security risks such as phishing, scams, and malware distribution.

The system combines **static heuristic analysis** with **dynamic external intelligence** to generate a risk score and a clear verdict (`SAFE`, `SUSPICIOUS`, or `DANGEROUS`) for every opened email.

---

## 🏗️ Architecture

The solution relies on a **Client-Server** architecture to offload heavy processing from the limited Google Apps Script environment.

1.  **Client (Gmail Add-on):**
    * Built with **Google Apps Script**.
    * Extracts metadata (Headers, Body, Links, Attachments) from the active email.
    * Renders the UI (CardService) to display results to the user.
2.  **Server (Backend Analysis Service):**
    * Built with **Node.js & Express**.
    * Performs deep content inspection and heuristic checks.
    * Communicates with external threat intelligence APIs.
    * Aggregates signals and calculates the final risk score.

---

## 🔧 Project Structure

The project follows a modular design, separating the heuristic logic, service layer, and API routes.

<details>
<summary>🗂️ Click to view full folder tree</summary>

```text
Mail-Risk-Scanner/
├── checks/                  # Heuristic logic modules
│   ├── attachmentChecks.js  # File extension & double-extension detection
│   ├── contentChecks.js     # NLP-based keyword analysis (Urgency, Crypto, etc.)
│   ├── linkChecks.js        # URL structure analysis (IPs, Shorteners)
│   ├── senderChecks.js      # Sender authenticity & Reply-To mismatch
│   └── urlscanChecks.js     # External API integration logic
│
├── services/                # Business logic
│   ├── scanService.js       # Main orchestrator
│   ├── signalAggregator.js  # Score calculation & de-duplication
│   └── urlscanClient.js     # HTTP Client for urlscan.io
│
├── gmail-addon/             # Frontend (Google Apps Script)
│   ├── Code.gs              # Main Add-on logic
│   ├── appsscript.json      # Manifest & Permissions
│   └── backendClient.gs     # Networking with the backend
│
├── routes/                  # API Definitions
│   └── scan.js              # POST /scan endpoint
│
├── utils/                   # Helper functions
│   ├── email.js             # Email parsing
│   ├── filename.js          # File analysis
│   ├── text.js              # Text matching
│   └── url.js               # URL parsing
│
├── app.js                   # Express App configuration
├── server.js                # Server entry point
└── package.json             # Dependencies & Scripts
</details>

✨ Features
The scanner evaluates emails based on four main vectors:

Content Analysis: Detects high-pressure language ("Urgent", "Act Now"), credential theft attempts, and financial scams.

Sender Verification: Identifies "Reply-To" mismatches and suspicious use of free email providers for business contexts.

Link Inspection: Analyzes URLs for IP-based hostnames, unencrypted HTTP, and known URL shorteners.

Attachment Scanning: Flags dangerous file types (.exe, .scr) and deceptive naming conventions (e.g., invoice.pdf.exe).

External Intelligence: Real-time integration with urlscan.io to check if links are known malicious sites.

📡 APIs & Interfaces
Internal API
The backend exposes a single RESTful endpoint used by the Add-on:

POST /scan

Input: JSON object containing subject, bodyText, links, attachments, from, replyTo.

Output: JSON object with score, verdict, summary, and a list of signals.

External APIs
urlscan.io API: Used to scan URLs found in the email body. The system submits the URL and polls for a verdict (Malicious/Clean) to enrich the risk score.

Google APIs
GmailApp: To read message data.

CardService: To build the Add-on UI.

UrlFetchApp: To communicate with the backend.

⚙️ Getting Started
✔️ Prerequisites
Node.js (v14 or higher)

npm (Node Package Manager)

Google Account (to deploy the Add-on)

urlscan.io API Key (Free tier is sufficient)

📦 Installation & Setup (Backend)
Clone the repository:

Bash

git clone [https://github.com/Rut-Hagai/Mail-Risk-Scanner.git](https://github.com/Rut-Hagai/Mail-Risk-Scanner.git)
cd Mail-Risk-Scanner
Install dependencies:

Bash

npm install
Configure Environment: Create a .env file in the root directory:

קטע קוד

PORT=3000
URLSCAN_API_KEY=your_actual_api_key
URLSCAN_VISIBILITY=public
Run the Server:

Bash

npm start
📧 Setup (Gmail Add-on)
Go to Google Apps Script.

Create a new project and paste the contents of gmail-addon/Code.gs and appsscript.json.

Set the backend URL in Project Settings > Script Properties:

Property: BACKEND_BASE_URL

Value: http://your-server-address:3000 (Use ngrok for local testing).

Deploy as a Google Workspace Add-on.

▶️ Usage
Once installed, simply open any email in Gmail (Web or Mobile). The Add-on will automatically:

Analyze the email content.

Display a card in the sidebar.

Show the Verdict (Safe/Suspicious/Dangerous) and the Risk Score.

List specific Signals explaining why the email was flagged.

🧩 Example Output
Backend Response (JSON):

JSON

{
  "score": 85,
  "verdict": "DANGEROUS",
  "summary": "DANGEROUS based on: URL flagged as malicious; Attachment has a double extension",
  "signals": [
    {
      "id": "URLSCAN_MALICIOUS",
      "label": "urlscan: URL flagged as malicious",
      "severity": "HIGH",
      "weight": 45
    },
    {
      "id": "ATTACHMENT_DOUBLE_EXTENSION",
      "label": "Attachment has a double extension",
      "severity": "HIGH",
      "weight": 25
    }
  ]
}
⚠️ Limitations & Constraints
🇺🇸 Language Support: The Natural Language Processing (NLP) and keyword heuristics currently support English only. Emails in other languages may not be analyzed correctly for content-based risks.

Execution Time: Google Apps Script has a strict timeout (30s). The backend must respond quickly; therefore, external API checks have a short timeout threshold.

Prototype Status: This is a home task project and is not intended for production use without further security hardening.

👩‍💻 Author
Ruth Hagai

Role: Developer & Security Researcher

Context: Upwind Student Program

⭐ If you found this project interesting, feel free to explore the code!
