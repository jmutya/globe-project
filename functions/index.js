// functions/index.js
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const createUserRoute = require("./createUser"); // adjust if you keep it in /routes/

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api", createUserRoute);

// Export as a Firebase Function
exports.api = functions.https.onRequest(app);
