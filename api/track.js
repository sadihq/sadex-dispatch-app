// In-memory live rider tracking state for SADEX Express Fleet
import { requireRole, parseBody } from "./_auth.js";

let latestTracking = {
  riderId: "SADEX 01",
  riderName: "SADEX Unit 01 (Abuja)",
  lat: 9.0765,
  lng: 7.4986,
  speed: 0,
  heading: 0,
  accuracy: 10,
  status: "Active",
  timestamp: Date.now(),
  lastUpdated: new Date().toISOString()
};

export default async function trackHandler(req, res) {
  if (req.method === "POST") {
    // Riders (and the CEO testing from their phone) can send positions.
    if (!requireRole(req, res, "rider")) return;
    try {
      const body = parseBody(req);
      const { lat, lng, speed, heading, accuracy, riderId, riderName, status } = body;

      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      const inRange = parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180;
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && inRange) {
        const parsedSpeed = typeof speed === "number" ? speed : parseFloat(speed);
        const speedKmh = !isNaN(parsedSpeed) && parsedSpeed >= 0
          ? Math.round(parsedSpeed * 3.6)
          : 0;

        let derivedStatus = status || "Active";
        if (speedKmh > 3) {
          derivedStatus = "Moving";
        } else if (speedKmh === 0) {
          derivedStatus = "Idle";
        }

        const parsedHeading = typeof heading === "number" ? heading : parseFloat(heading);
        const parsedAccuracy = typeof accuracy === "number" ? accuracy : parseFloat(accuracy);

        latestTracking = {
          riderId: riderId || "SADEX 01",
          riderName: riderName || "SADEX Unit 01 (Abuja)",
          lat: parsedLat,
          lng: parsedLng,
          speed: speedKmh,
          heading: !isNaN(parsedHeading) ? Math.round(parsedHeading) : 0,
          accuracy: !isNaN(parsedAccuracy) ? Math.round(parsedAccuracy) : 8,
          status: derivedStatus,
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString()
        };

        return res.status(200).json({ success: true, data: latestTracking });
      }

      return res.status(400).json({ success: false, error: "Valid latitude and longitude numbers are required" });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Could not save location" });
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Use GET or POST" });
  }

  // Only the CEO console can see where the rider is.
  if (!requireRole(req, res, "ceo")) return;
  return res.status(200).json({ success: true, data: latestTracking });
}
