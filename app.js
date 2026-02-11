// app.js
// Defines the Express application: middleware + routes.
// Exporting the app allows running the server from server.js and enables easy testing.

const scanRoutes = require('./routes/scan');

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware:: allow requests from Gmail Add-on (browser / Google)
app.use(cors());

// Middleware: parse JSON bodies so req.body is available in POST/PUT requests
app.use(express.json());

app.use(scanRoutes);

// Health-check endpoint to verify the service is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});


module.exports = app;
