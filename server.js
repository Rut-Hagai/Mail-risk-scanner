/**
 * server.js
 *
 * Entry point of the backend service.
 * Responsible for starting the HTTP server.
 * This file should not contain application logic.
 */

require("dotenv").config();

const app = require('./app');

// Port on which the server will listen
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Mail Risk Scanner backend running on port ${PORT}`);
});
