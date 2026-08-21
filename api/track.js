// In-memory live rider tracking state for SADEX Express Fleet
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { lat, lng, speed, heading, accuracy, riderId, riderName, status } = body;

      if (typeof lat === "number" && typeof lng === "number") {
        const speedKmh = typeof speed === "number" && !isNaN(speed) && speed >= 0
          ? Math.round(speed * 3.6)
          : (typeof speed === "number" ? Math.round(speed) : 0);

        let derivedStatus = status || "Active";
        if (speedKmh > 3) {
          derivedStatus = "Moving";
        } else if (speedKmh === 0) {
          derivedStatus = "Idle";
        }

        latestTracking = {
          riderId: riderId || "SADEX 01",
          riderName: riderName || "SADEX Unit 01 (Abuja)",
          lat: Number(lat),
          lng: Number(lng),
          speed: speedKmh,
          heading: typeof heading === "number" ? Math.round(heading) : 0,
          accuracy: typeof accuracy === "number" ? Math.round(accuracy) : 8,
          status: derivedStatus,
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString()
        };

        return res.status(200).json({ success: true, data: latestTracking });
      }

      return res.status(400).json({ success: false, error: "Latitude and longitude numbers are required" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET request returns the latest live telemetry
  return res.status(200).json({ success: true, data: latestTracking });
}
