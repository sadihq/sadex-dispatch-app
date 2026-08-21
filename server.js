import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import handler from "./api/notion.js";
import optimizeHandler from "./api/optimize-route.js";

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

// Route Optimization API Route
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

// Serve static frontend assets
app.use(express.static(__dirname));

// Fallback to index.html for SPA/root routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SADEX Dispatch Console running on http://0.0.0.0:${PORT}`);
});
