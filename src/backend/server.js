// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import createUserRoute from "../components/Sidebar/navigation/createUser.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Route
app.use("/api", createUserRoute);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});