import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import handler from "./api/notion.js";
import optimizeHandler from "./api/optimize-route.js";
import trackHandler from "./api/track.js";
import distanceHandler from "./api/distance.js";
import loginHandler from "./api/login.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Notion API Proxy Route
app.all("/api/notion", async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("API error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

// Dynamic Fare Calculation & Distance Routing Route
app.all("/api/distance", async (req, res) => {
  try {
    await distanceHandler(req, res);
  } catch (error) {
    console.error("Distance API error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

// Route Optimization API Route (Zero-Key OSRM & Geodesic)
app.all("/api/optimize-route", async (req, res) => {
  try {
    await optimizeHandler(req, res);
  } catch (error) {
    console.error("Route Optimization error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

// Live Rider GPS Tracking Telemetry API Route
app.all("/api/track", async (req, res) => {
  try {
    await trackHandler(req, res);
  } catch (error) {
    console.error("Tracking API error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

// PIN login for riders and the CEO console (same handler Vercel runs)
app.post("/api/login", async (req, res) => {
  try {
    await loginHandler(req, res);
  } catch (error) {
    console.error("Login error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Login failed" });
    }
  }
});

// Specific route mappings
app.get("/rider", (req, res) => {
  res.sendFile(path.join(__dirname, "rider.html"));
});

app.get("/ceo", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve static frontend assets
app.use(express.static(__dirname));

// Fallback to index.html for SPA/root routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SADEX Dispatch Console running on http://0.0.0.0:${PORT}`);
});
