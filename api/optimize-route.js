// Zero-Key Route Optimization Service for SADEX Express Abuja Logistics
// Uses the Free OSRM Trip API (Traveling Salesperson Problem solver) & Geodesic Abuja coordination
// Requires ZERO API Keys.

const ABUJA_DISTRICT_COORDS = {
  maitama: { lat: 9.0882, lng: 7.4933 },
  "wuse 2": { lat: 9.0754, lng: 7.4728 },
  "wuse ii": { lat: 9.0754, lng: 7.4728 },
  wuse: { lat: 9.0680, lng: 7.4650 },
  "central area": { lat: 9.0579, lng: 7.4951 },
  cbd: { lat: 9.0579, lng: 7.4951 },
  "area 11": { lat: 9.0430, lng: 7.4990 },
  "area 1": { lat: 9.0320, lng: 7.4680 },
  "area 2": { lat: 9.0350, lng: 7.4750 },
  "area 3": { lat: 9.0380, lng: 7.4820 },
  "area 7": { lat: 9.0410, lng: 7.4890 },
  "area 8": { lat: 9.0420, lng: 7.4930 },
  "area 10": { lat: 9.0450, lng: 7.4960 },
  garki: { lat: 9.0305, lng: 7.4855 },
  utako: { lat: 9.0625, lng: 7.4425 },
  jabi: { lat: 9.0734, lng: 7.4253 },
  mabushi: { lat: 9.0810, lng: 7.4560 },
  katampe: { lat: 9.1050, lng: 7.4620 },
  "katampe extension": { lat: 9.1120, lng: 7.4780 },
  guzape: { lat: 9.0286, lng: 7.5312 },
  asokoro: { lat: 9.0497, lng: 7.5255 },
  apo: { lat: 8.9950, lng: 7.4930 },
  "apo mechanic": { lat: 8.9880, lng: 7.4900 },
  "apo resettlement": { lat: 8.9830, lng: 7.5120 },
  gwarinpa: { lat: 9.1099, lng: 7.3917 },
  life_camp: { lat: 9.0680, lng: 7.3980 },
  "life camp": { lat: 9.0680, lng: 7.3980 },
  kado: { lat: 9.0820, lng: 7.4350 },
  durumi: { lat: 9.0180, lng: 7.4650 },
  lokogoma: { lat: 8.9850, lng: 7.4420 },
  galadimawa: { lat: 8.9920, lng: 7.4280 },
  "games village": { lat: 9.0120, lng: 7.4520 },
  kubwa: { lat: 9.1538, lng: 7.3340 },
  lugbe: { lat: 8.9772, lng: 7.3688 },
  karu: { lat: 9.0080, lng: 7.5750 },
  nyanya: { lat: 9.0250, lng: 7.6050 },
  mararaba: { lat: 9.0350, lng: 7.6320 },
  airport: { lat: 8.9959, lng: 7.2632 },
  "centenary city": { lat: 8.9150, lng: 7.3750 },
  gwagwalada: { lat: 8.9430, lng: 7.0860 },
  bwari: { lat: 9.2780, lng: 7.3820 },
  kuje: { lat: 8.8890, lng: 7.2340 },
  mpape: { lat: 9.1350, lng: 7.4920 },
  dawaki: { lat: 9.1380, lng: 7.3790 },
  dutse: { lat: 9.1680, lng: 7.3650 }
};

function estimateAbujaCoordinates(address) {
  const lower = (address || "").toLowerCase();
  for (const [key, coords] of Object.entries(ABUJA_DISTRICT_COORDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  // Default Central Abuja coordinates
  return { lat: 9.0579, lng: 7.4951 };
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Client/Server Nearest-Neighbor Traveling Salesperson (Geodesic Shortest Path)
function optimizeStopsByProximity(origin, stops) {
  if (stops.length <= 1) {
    return {
      optimizedStops: stops,
      optimizedIndices: stops.map((_, i) => i)
    };
  }

  let originCoord = { lat: 9.0579, lng: 7.4951 };
  if (origin && typeof origin === "object" && origin.latitude && origin.longitude) {
    originCoord = { lat: Number(origin.latitude), lng: Number(origin.longitude) };
  } else if (typeof origin === "string") {
    originCoord = estimateAbujaCoordinates(origin);
  }

  const stopCoords = stops.map(s => estimateAbujaCoordinates(s.address));
  const unvisited = stops.map((stop, index) => ({ stop, index, coord: stopCoords[index] }));
  const ordered = [];
  const orderedIndices = [];

  let currentCoord = originCoord;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistanceKm(
        currentCoord.lat,
        currentCoord.lng,
        unvisited[i].coord.lat,
        unvisited[i].coord.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const [selected] = unvisited.splice(nearestIdx, 1);
    ordered.push(selected.stop);
    orderedIndices.push(selected.index);
    currentCoord = selected.coord;
  }

  return {
    optimizedStops: ordered,
    optimizedIndices: orderedIndices
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { origin, stops } = req.body || {};

  if (!stops || !Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({ message: "Invalid or empty stops array" });
  }

  if (stops.length === 1) {
    return res.status(200).json({
      success: true,
      optimizedStops: stops,
      optimizedIndices: [0],
      provider: "single_stop"
    });
  }

  // Format addresses to guarantee Abuja geocoding context
  const cleanStops = stops.map(s => {
    let addr = (s.address || "").trim();
    if (!/abuja/i.test(addr)) addr = `${addr}, Abuja`;
    return { ...s, formattedAddress: addr };
  });

  let originCoord = { lat: 9.0579, lng: 7.4951 };
  if (origin && typeof origin === "object" && origin.latitude && origin.longitude) {
    originCoord = { lat: Number(origin.latitude), lng: Number(origin.longitude) };
  } else if (typeof origin === "string") {
    originCoord = estimateAbujaCoordinates(origin);
  }

  // Attempt free OSRM Trip API (No API key required)
  try {
    const coordsList = [
      `${originCoord.lng.toFixed(5)},${originCoord.lat.toFixed(5)}`,
      ...cleanStops.map(s => {
        const c = estimateAbujaCoordinates(s.address);
        return `${c.lng.toFixed(5)},${c.lat.toFixed(5)}`;
      })
    ];

    const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsList.join(";")}?source=first&overview=false&steps=false&roundtrip=false`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const osrmRes = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SADEX-Express-Abuja-Dispatcher/1.0" }
    });
    clearTimeout(timeoutId);

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && Array.isArray(osrmData.waypoints) && osrmData.waypoints.length > 1) {
        // Waypoint 0 is origin. The remaining waypoints 1..N correspond to the stops.
        // OSRM returns waypoints sorted by original input index, where waypoint_index indicates visit order.
        const stopWaypoints = osrmData.waypoints.slice(1);
        
        // Sort stops by their visit order (waypoint_index)
        const sortedByTripOrder = stopWaypoints
          .map((wp, originalIdx) => ({
            originalStop: cleanStops[originalIdx],
            originalIdx,
            tripOrder: wp.waypoint_index
          }))
          .sort((a, b) => a.tripOrder - b.tripOrder);

        const optimizedStops = sortedByTripOrder.map(item => item.originalStop);
        const optimizedIndices = sortedByTripOrder.map(item => item.originalIdx);

        return res.status(200).json({
          success: true,
          optimizedStops,
          optimizedIndices,
          provider: "free_osrm_trip_api"
        });
      }
    }
  } catch (osrmErr) {
    console.warn("OSRM Trip API call failed/timed out, using geodesic optimization:", osrmErr.message);
  }

  // Geodesic TSP fallback (Zero-Key)
  const proximityResult = optimizeStopsByProximity(originCoord, cleanStops);

  return res.status(200).json({
    success: true,
    optimizedStops: proximityResult.optimizedStops,
    optimizedIndices: proximityResult.optimizedIndices,
    provider: "shortest_path_geodesic"
  });
}
