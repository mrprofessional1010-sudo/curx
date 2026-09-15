import { NextResponse } from "next/server";
import { findNearbyFacilities, normalizeFacilitiesForMap } from "@/lib/engine/careFinder";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLat = parseFloat(searchParams.get("lat") || "37.7749");
  const rawLon = parseFloat(searchParams.get("lon") || "-122.4194");
  const lat = Number.isFinite(rawLat) ? rawLat : 37.7749;
  const lon = Number.isFinite(rawLon) ? rawLon : -122.4194;
  const radius = parseInt(searchParams.get("radius") || "5000", 10);
  const facilityType = searchParams.get("type") || "hospital";

  try {
    const rawFacilities = await findNearbyFacilities(lat, lon, radius, facilityType);
    const normalizedFacilities = normalizeFacilitiesForMap(rawFacilities, lat, lon);

    return NextResponse.json({
      location: { latitude: lat, longitude: lon, radiusMeters: radius },
      totalFound: normalizedFacilities.length,
      facilities: normalizedFacilities,
    });
  } catch (err: any) {
    console.error("Error retrieving nearby facilities:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
