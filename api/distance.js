// Dynamic Route Distance & Geocoding Calculation API for SADEX Express Abuja
// Queries OSRM Driving Router with robust fallback to geodesic distance matrix

const SADEX_HUB = {
  name: "SADEX Central Hub (Galadimawa)",
  lat: 9.0016,
  lng: 7.4278,
  address: "Galadimawa Hub, Abuja"
};

const ABUJA_DISTRICT_COORDS = {
  maitama: { lat: 9.0882, lng: 7.4933 },
  "wuse 2": { lat: 9.0754, lng: 7.4728 },
  "wuse ii": { lat: 9.0754, lng: 7.4728 },
  wuse: { lat: 9.0680, lng: 7.4650 },
  "central area": { lat: 9.0579, lng: 7.4951 },
  "central business district": { lat: 9.0579, lng: 7.4951 },
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
  galadimawa: { lat: 9.0016, lng: 7.4278 },
  "galadimawa hub": { lat: 9.0016, lng: 7.4278 },
  "sadex central hub": { lat: 9.0016, lng: 7.4278 },
  "sadex hub": { lat: 9.0016, lng: 7.4278 },
  "central hub": { lat: 9.0016, lng: 7.4278 },
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
  dutse: { lat: 9.1680, lng: 7.3650 },
  banex: { lat: 9.0754, lng: 7.4728 },
  "transcorp hilton": { lat: 9.0782, lng: 7.4933 },
  "jabi lake mall": { lat: 9.0734, lng: 7.4253 },
  "ceddi plaza": { lat: 9.0579, lng: 7.4951 },
  "grand square": { lat: 9.0579, lng: 7.4951 }
};

function estimateAbujaCoordinates(address) {
  const lower = (address || "").toLowerCase();
  for (const [key, coords] of Object.entries(ABUJA_DISTRICT_COORDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  // Default to Galadimawa Central Hub
  return { lat: 9.0016, lng: 7.4278 };
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const pickup = req.body?.originAddress || req.body?.pickup || req.query.originAddress || req.query.pickup || "Galadimawa Hub, Abuja";
    const delivery = req.body?.destinationAddress || req.body?.delivery || req.query.destinationAddress || req.query.delivery || "Maitama, Abuja";
    const category = req.body?.itemCategory || req.body?.category || req.query.itemCategory || req.query.category || "Standard";

    const originCoords = estimateAbujaCoordinates(pickup);
    const destCoords = estimateAbujaCoordinates(delivery);

    let distanceKm = 0;
    let provider = "osrm_road_network";

    // Attempt OSRM driving calculation
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false`;
      const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(3500) });
      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        if (osrmData.routes && osrmData.routes[0] && osrmData.routes[0].distance) {
          distanceKm = Math.round((osrmData.routes[0].distance / 1000) * 10) / 10;
          provider = "osrm_road_network";
        }
      }
    } catch (osrmErr) {
      console.warn("OSRM routing unavailable, using geodesic calculation:", osrmErr.message);
    }

    if (!distanceKm || distanceKm < 1.0) {
      const geoKm = calculateDistanceKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
      // Abuja road tortuosity factor ~ 1.32
      distanceKm = Math.max(1.8, Math.round(geoKm * 1.32 * 10) / 10);
      provider = "geodesic_abuja_matrix";
    }

    // Dynamic Fare Calculation Formula
    const baseStart = 1000;
    const perKmRate = 120;
    const minFloor = 2000;
    const isFragile = (category || "").toLowerCase().includes("fragile");
    const fragileSurcharge = isFragile ? 500 : 0;
    const distanceCost = Math.round(distanceKm * perKmRate);

    const rawTotal = baseStart + distanceCost + fragileSurcharge;
    const floorPriceApplied = rawTotal < minFloor;
    const totalWithFloor = Math.max(minFloor, rawTotal);
    const roundedFinal = Math.ceil(totalWithFloor / 100) * 100;

    const fareBreakdown = {
      baseStart,
      perKmRate,
      distanceKm,
      distanceCost,
      isFragile,
      fragileSurcharge,
      minFloor,
      rawTotal,
      floorPriceApplied,
      totalWithFloor,
      finalTotal: roundedFinal,
      roundedFinal
    };

    return res.status(200).json({
      success: true,
      pickup,
      delivery,
      category,
      originCoords,
      destCoords,
      distanceKm,
      routingProvider: provider,
      fare: fareBreakdown,
      fareBreakdown
    });
  } catch (error) {
    console.error("Distance API error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
