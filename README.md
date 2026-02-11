# Mail-risk-scanner (Gmail Add-on + Node.js Backend)

[![Language](https://img.shields.io/badge/language-JavaScript-yellow)](#about-the-project)
[![Platform](https://img.shields.io/badge/platform-Google%20Workspace-lightgrey)](#getting-started)
[![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green)](#architecture)
[![API](https://img.shields.io/badge/external%20api-urlscan.io-blue)](#external-apis-used)

---

## 🧭 Table of Contents
<details open>
<summary>🧭 <b>Table of Contents (click to collapse)</b></summary>

- [📘 About the Project](#about-the-project)
- [🏗️ Architecture](#architecture)
- [🔌 External APIs Used](#external-apis-used)
- [🔧 Project Structure](#project-structure)
- [🧠 Risk Scoring Logic](#risk-scoring-logic)
- [✨ Features](#features)
- [⚠️ Limitations](#limitations)
- [⚙️ Getting Started](#getting-started)
  - [✔️ Prerequisites](#prerequisites)
  - [📦 Installation & Setup](#installation--setup)
  - [▶️ Running the Backend](#running-the-backend)
  - [🌐 Exposing the Backend (ngrok)](#exposing-the-backend-ngrok)
  - [📧 Gmail Add-on Setup](#gmail-add-on-setup)
  - [🧪 Testing the Backend (PowerShell)](#testing-the-backend-powershell)
- [🔐 Security Notes](#security-notes)
- [👩‍💻 Author](#author)

</details>

---

<a id="about-the-project"></a>
## 📘 About the Project

**Mail Risk Scanner** is a **Gmail Add-on** that scans the currently opened email and returns:

- **Risk score (0–100)**
- **Verdict**: `SAFE` / `SUSPICIOUS` / `DANGEROUS`
- **Explainable signals** (human-readable reasons + weights)

The system is split into:
1) **Gmail Add-on (Google Apps Script)** — extracts email fields (sender/subject/body/links/attachments metadata) and renders the UI  
2) **Backend (Node.js + Express)** — runs checks, calls external URL reputation intelligence, aggregates signals, and computes the final score

This project was built as a technical assignment and intentionally uses a modular structure to support adding more checks and external APIs.

---

<a id="architecture"></a>
## 🏗️ Architecture

USER (Gmail)
   │
   ▼
┌────────────────────────────────────┐
│        Gmail Add-on (Apps Script)  │
│------------------------------------│
│ • Triggered when email is opened  │
│ • Extracts normalized payload:     │
│   - from / replyTo                 │
│   - subject                        │
│   - plain body                     │
│   - links (regex extraction)       │
│   - attachments metadata           │
│ • Sends POST /scan to backend      │
│ • Renders result card (CardService)│
└──────────────────┬─────────────────┘
                   │ HTTPS (JSON)
                   ▼
┌────────────────────────────────────┐
│        Express Backend             │
│        (Node.js + Express)         │
│------------------------------------│
│ app.js → middleware + routes       │
│ server.js → environment + listen   │
│                                    │
│ POST /scan                         │
│ routes/scan.js                     │
│  • Input normalization             │
│  • Delegates to scanService        │
└──────────────────┬─────────────────┘
                   ▼
┌────────────────────────────────────┐
│         scanService.js             │
│     (Orchestration Layer)          │
│------------------------------------│
│ • Executes all check modules       │
│ • Calls external APIs              │
│ • Collects raw signals             │
│ • Aggregates signals               │
│ • Computes final score (0–100)     │
│ • Determines verdict               │
│ • Returns structured JSON result   │
└──────────────────┬─────────────────┘
                   ▼
        ┌────────────────────────┐
        │      Check Modules     │
        │   (Independent Units)  │
        ├────────────────────────┤
        │ senderChecks.js        │
        │ contentChecks.js       │
        │ linkChecks.js          │
        │ attachmentChecks.js    │
        │ urlscanChecks.js       │
        └────────────┬───────────┘
                     ▼
        ┌────────────────────────┐
        │ signalAggregator.js    │
        │------------------------│
        │ • De-duplicates        │
        │ • Caps entity weights  │
        │ • Prevents inflation   │
        │ • Preserves evidence   │
        └────────────┬───────────┘
                     ▼
        ┌────────────────────────┐
        │ External Intelligence  │
        │------------------------│
        │ urlscanClient.js       │
        │ → urlscan.io API       │
        └────────────────────────┘
                     ▼
┌────────────────────────────────────┐
│        Final JSON Response         │
│------------------------------------│
│ {                                  │
│   score: number (0–100),           │
│   verdict: SAFE | SUSPICIOUS |     │
│            DANGEROUS,              │
│   summary: string,                 │
│   signals: Signal[]                │
│ }                                  │
└────────────────────────────────────┘
                   │
                   ▼
        Gmail Add-on renders:
        • Verdict
        • Score
        • Top signals
        • Email snapshot



---

<a id="external-apis-used"></a>
## 🔌 External APIs Used

### urlscan.io
The backend integrates with **urlscan.io** for URL reputation enrichment:
- Submit URL for scanning
- Poll for scan results (UUID)
- Translate verdicts into risk signals

Relevant code:
- `services/urlscanClient.js` (HTTP client using axios)
- `checks/urlscanChecks.js` (turns results into Signals)

---

<a id="project-structure"></a>
## 🔧 Project Structure

<details>
<summary>🗂️ <b>Click to view folder tree</b></summary>

```text
Mail-risk-scanner/
│
├── checks/                       # Heuristic & enrichment checks (pure logic modules)
│   ├── attachmentChecks.js       # Attachment metadata heuristics (zip, risky extensions, etc.)
│   ├── contentChecks.js          # Suspicious keyword & text pattern detection
│   ├── linkChecks.js             # Link heuristics (shorteners, IP URLs, non-HTTPS)
│   ├── senderChecks.js           # Sender-based checks (reply-to mismatch, anomalies)
│   └── urlscanChecks.js          # Converts urlscan.io results into risk signals
│
├── gmail-addon/                  # Google Apps Script (Gmail Add-on frontend)
│   ├── Code.gs                   # Entry point: buildAddOn, extraction, card rendering
│   ├── appsscript.json           # Add-on manifest (scopes, triggers, metadata)
│   └── backendClient.gs          # Thin HTTP client calling backend /scan endpoint
│
├── routes/                       # Express route layer (HTTP only)
│   └── scan.js                   # POST /scan endpoint (request normalization)
│
├── services/                     # Core business logic
│   ├── scanService.js            # Orchestrates checks → aggregation → score → verdict
│   ├── signalAggregator.js       # Deduplicates entity signals (prevents score inflation)
│   └── urlscanClient.js          # Axios-based client for urlscan.io API
│
├── utils/                        # Shared helper utilities
│   ├── email.js                  # Email parsing & normalization helpers
│   ├── filename.js               # Filename & extension parsing utilities
│   ├── text.js                   # Text normalization helpers
│   └── url.js                    # URL parsing & validation helpers
│
├── app.js                        # Express app configuration (middleware + routes)
├── server.js                     # Application entry point (dotenv + app.listen)
├── package.json                  # Dependencies & npm scripts
├── package-lock.json             # Dependency lock file
└── README.md                     # Project documentation

</details>

<a id="risk-scoring-logic"></a>

🧠 Risk Scoring Logic
Signal model

Each check returns a list of Signals:
{
  id: "LINK_SHORTENER",
  label: "Link uses a URL shortener",
  severity: "MEDIUM",
  weight: 18,
  evidence: { link: "...", host: "bit.ly" }
}
Aggregation (prevent score inflation)

Signals that refer to the same entity (e.g., the same link) are aggregated by:

evidence.link (preferred)

evidence.ip

fallback key: id

Aggregation behavior:

duplicates add only 50% weight (not full double)

aggregated weight is capped per entity

provenance is preserved in evidence.sources

Score + verdict

Score = sum of aggregated weights, clamped into 0..100

Verdict thresholds:

SAFE < 25

SUSPICIOUS >= 25

DANGEROUS >= 60

<a id="features"></a>

✨ Features

Gmail Add-on (contextual trigger) scans the currently opened email

Extracts:

sender (from), replyTo

subject

plain text body

links (regex-based extraction)

attachments metadata (name/type/size only)

Backend modular checks:

link heuristics (shorteners, raw IP URL, non-HTTPS)

attachment heuristics (archives, risky extensions, etc.)

content heuristics (suspicious keywords/patterns)

sender heuristics (basic mismatch patterns)

urlscan enrichment for URL reputation (best-effort, bounded)

<a id="limitations"></a>

⚠️ Limitations

Attachments are not uploaded or scanned by content (metadata only)

urlscan is async by nature; results may be pending depending on timing

No caching layer yet (re-scanning the same URL may repeat work)

Heuristic-based scoring can produce false positives/negatives (expected tradeoff for an MVP)

<a id="getting-started"></a>

⚙️ Getting Started

<a id="prerequisites"></a>

✔️ Prerequisites

Node.js (v18+ recommended)

npm

Gmail account Google Apps Script project (Gmail Add-on)


urlscan.io API key


(Optional) ngrok for exposing localhost to Gmail



<a id="installation--setup"></a>
📦 Installation & Setup
git clone <repo-url>
cd mail-risk-scanner-backend
npm install

Create .env (do NOT commit it):
URLSCAN_API_KEY=YOUR_URLSCAN_KEY
URLSCAN_VISIBILITY=public


<a id="running-the-backend"></a>
▶️ Running the Backend
npm start

Backend listens on port 3000 (see server.js).
Health check:
GET http://localhost:3000/health


<a id="exposing-the-backend-ngrok"></a>
🌐 Exposing the Backend (ngrok)
Gmail Add-ons need a public HTTPS endpoint:
ngrok http 3000

Copy the HTTPS forwarding URL, for example:
https://xxxxx.ngrok-free.dev


<a id="gmail-add-on-setup"></a>
📧 Gmail Add-on Setup


Open the Apps Script project


Ensure appsscript.json includes required scopes:


gmail.readonly


gmail.addons.execute


script.external_request




Set Script Property BACKEND_BASE_URL:


Apps Script → Project Settings → Script properties


Key: BACKEND_BASE_URL


Value: https://xxxxx.ngrok-free.dev




Deploy the Gmail Add-on (Test deployment is sufficient for demo)


Open Gmail → open an email → open the Add-on sidebar to see results.



<a id="testing-the-backend-powershell"></a>
🧪 Testing the Backend (PowerShell)
Invoke-RestMethod `
  -Uri http://localhost:3000/scan `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "links": ["http://bit.ly/test"],
    "attachments": [{"filename":"invoice.zip"}]
  }'


<a id="security-notes"></a>
🔐 Security Notes


Never commit .env (contains API keys)


Never commit node_modules/


Gmail Add-on performs metadata extraction only


External API calls are designed to be bounded so the UI remains responsive



<a id="author"></a>
👩‍💻 Author
Developed by Rut Hagai
GitHub: https://github.com/Rut-Hagai

::contentReference[oaicite:0]{index=0}


