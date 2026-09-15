"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { MapPin, Navigation, Building2, Clock, Phone, ArrowUpRight, Shield, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export interface CareFacility {
  id: string;
  name: string;
  type: string;
  specialty: string;
  distance: string;
  travelTime: string;
  status: string;
  tier: string;
  phone?: string;
  address?: string;
  latitude: number;
  longitude: number;
  emergencyAvailable?: boolean;
  coordinates: { x: number; y: number };
}

const DEFAULT_FACILITIES: CareFacility[] = [
  {
    id: "default_01",
    name: "Metropolitan Academic Medical Center",
    type: "Comprehensive Health System",
    specialty: "Pharmacogenomics & Clinical Oncology",
    distance: "1.8 miles away (2.9 km)",
    travelTime: "6 min drive",
    status: "Open 24/7 (Emergency Active)",
    tier: "Level 1 Trauma & Emergency",
    latitude: 37.7749,
    longitude: -122.4194,
    emergencyAvailable: true,
    coordinates: { x: 42, y: 38 },
  },
  {
    id: "default_02",
    name: "St. Jude Regional Specialty Clinic",
    type: "Outpatient Specialty Center",
    specialty: "Precision Medicine & Cardiology",
    distance: "3.4 miles away (5.5 km)",
    travelTime: "11 min drive",
    status: "Open (Operating Hours)",
    tier: "Outpatient Precision Center",
    latitude: 37.7849,
    longitude: -122.4094,
    emergencyAvailable: false,
    coordinates: { x: 68, y: 55 },
  },
  {
    id: "default_03",
    name: "Westside Community Health Network",
    type: "Community Medical Access",
    specialty: "Primary Care & Medication Review",
    distance: "4.9 miles away (7.9 km)",
    travelTime: "14 min drive",
    status: "Open until 10:00 PM",
    tier: "Community Medical Access",
    latitude: 37.7649,
    longitude: -122.4394,
    emergencyAvailable: false,
    coordinates: { x: 28, y: 72 },
  },
];

/**
 * Defensive client-side normalizer that guarantees every facility item
 * has valid finite coordinates: { x: number, y: number } between [12, 88].
 */
function sanitizeAndNormalizeClientFacilities(
  rawList: any[],
  centerLat: number = 37.7749,
  centerLon: number = -122.4194
): CareFacility[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [];
  }

  // Filter out non-objects
  const validItems = rawList.filter((item) => item && typeof item === "object");
  if (validItems.length === 0) return [];

  const latDiffs = validItems.map((f) =>
    typeof f.latitude === "number" && Number.isFinite(f.latitude) ? Math.abs(f.latitude - centerLat) : 0.015
  );
  const lonDiffs = validItems.map((f) =>
    typeof f.longitude === "number" && Number.isFinite(f.longitude) ? Math.abs(f.longitude - centerLon) : 0.015
  );
  const maxLatDelta = Math.max(0.012, Math.max(...latDiffs));
  const maxLonDelta = Math.max(0.012, Math.max(...lonDiffs));

  const result: CareFacility[] = [];

  validItems.forEach((f, idx) => {
    const lat = typeof f.latitude === "number" && Number.isFinite(f.latitude) ? f.latitude : centerLat;
    const lon = typeof f.longitude === "number" && Number.isFinite(f.longitude) ? f.longitude : centerLon;

    let coordX = 50;
    let coordY = 50;

    if (
      f.coordinates &&
      typeof f.coordinates.x === "number" &&
      Number.isFinite(f.coordinates.x) &&
      typeof f.coordinates.y === "number" &&
      Number.isFinite(f.coordinates.y)
    ) {
      coordX = Math.min(88, Math.max(12, Math.round(f.coordinates.x)));
      coordY = Math.min(88, Math.max(12, Math.round(f.coordinates.y)));
    } else {
      // Calculate from lat / lon
      const dLat = lat - centerLat;
      const dLon = lon - centerLon;
      let calculatedX = 50 + (dLon / maxLonDelta) * 35;
      let calculatedY = 50 - (dLat / maxLatDelta) * 35;

      if (Math.abs(calculatedX - 50) < 1 && Math.abs(calculatedY - 50) < 1) {
        const angle = (idx / Math.max(1, validItems.length)) * 2 * Math.PI;
        calculatedX = 50 + Math.cos(angle) * 22;
        calculatedY = 50 + Math.sin(angle) * 22;
      }
      coordX = Math.min(88, Math.max(12, Math.round(calculatedX)));
      coordY = Math.min(88, Math.max(12, Math.round(calculatedY)));
    }

    const distStr = typeof f.distance === "string" ? f.distance : `${(idx + 1) * 1.2} miles away`;
    const travelStr = typeof f.travelTime === "string" ? f.travelTime : `${Math.max(3, (idx + 1) * 4)} min drive`;

    result.push({
      id: f.id || `facility_${idx}`,
      name: f.name || `Healthcare Center 0${idx + 1}`,
      type: f.type || "Specialized Health Center",
      specialty: f.specialty || "Precision Medicine & Clinical Care",
      distance: distStr,
      travelTime: travelStr,
      status: f.status || "Open (Standard Hours)",
      tier: f.tier || "Verified Medical Facility",
      phone: f.phone || "(Verified Provider)",
      address: f.address,
      latitude: lat,
      longitude: lon,
      emergencyAvailable: Boolean(f.emergencyAvailable),
      coordinates: { x: coordX, y: coordY },
    });
  });

  return result;
}

export const NearbyCareSection: React.FC = () => {
  const [facilities, setFacilities] = useState<CareFacility[]>(DEFAULT_FACILITIES);
  const [selectedFacilityIndex, setSelectedFacilityIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("San Francisco Medical District");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({ lat: 37.7749, lon: -122.4194 });

  const fetchFacilities = async (lat: number, lon: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/care/nearby?lat=${lat}&lon=${lon}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      const data = await res.json();
      const sanitized = sanitizeAndNormalizeClientFacilities(data.facilities, lat, lon);

      if (sanitized.length > 0) {
        setFacilities(sanitized);
        setSelectedFacilityIndex(0);
      } else {
        setFacilities(DEFAULT_FACILITIES);
      }
    } catch (err: any) {
      console.warn("Care Finder: Using fallback network due to:", err);
      setErrorMsg("Unable to reach live OpenStreetMap API. Displaying regional reference network.");
      setFacilities(DEFAULT_FACILITIES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserCoords({ lat, lon });
          setLocationLabel(`${lat.toFixed(3)}°N, ${Math.abs(lon).toFixed(3)}°W (GPS Verified)`);
          fetchFacilities(lat, lon);
        },
        () => {
          fetchFacilities(37.7749, -122.4194);
        },
        { timeout: 4000 }
      );
    } else {
      fetchFacilities(37.7749, -122.4194);
    }
  }, []);

  const current: CareFacility = useMemo(() => {
    if (facilities.length === 0) return DEFAULT_FACILITIES[0];
    return facilities[selectedFacilityIndex] ?? facilities[0] ?? DEFAULT_FACILITIES[0];
  }, [facilities, selectedFacilityIndex]);

  const handleExport = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      patientIdentifier: "ELENA ROSTOVA // ID: PAT-84920",
      targetFacility: {
        id: current.id,
        name: current.name,
        type: current.type,
        specialty: current.specialty,
        tier: current.tier,
        distance: current.distance,
        address: current.address,
        phone: current.phone,
        status: current.status,
      },
      clinicalSummary: {
        pharmacogenomics: "CYP2D6 *4/*41 (Intermediate Metabolizer, Activity Score 0.5)",
        activeContraindication: "Tamoxifen + Fluoxetine potent phenoconversion (CYP2D6 substrate/inhibitor collision)",
        recommendedAction: "Consult prescribing physician or oncology team for SSRI/Tamoxifen regimen review.",
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CURX_Clinical_Summary_${current.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="care" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-graphite">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 09 // CARE CONTINUITY"
          badgeColor="cyan"
          title={
            <>
              From clinical understanding <br />
              <GlowText variant="cyan">to the next actionable step.</GlowText>
            </>
          }
          subtitle="Insight is only valuable when linked to timely human care. Curx maps structured risk summaries directly to verified local medical providers via live OpenStreetMap facility networks."
        />

        {/* Dark Geographic Facility Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-12">
          {/* Left Facility Map Mockup */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            {/* Spatial Dark Map Container */}
            <div className="relative w-full h-[280px] sm:h-[320px] rounded-xl bg-[#04080D] border border-white/[0.06] overflow-hidden flex items-center justify-center">
              {/* Radar circular sweeps */}
              <div className="absolute w-[240px] h-[240px] rounded-full border border-curx-cyan/15 animate-ping opacity-20 pointer-events-none" />
              <div className="absolute w-[360px] h-[360px] rounded-full border border-curx-cyan/10 pointer-events-none" />
              <div className="absolute w-[120px] h-[120px] rounded-full border border-curx-cyan/20 pointer-events-none" />

              {/* User Center Point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-curx-cyan/20 border border-curx-cyan">
                  <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
                </div>
                <span className="text-[9px] font-mono text-curx-cyan uppercase mt-1 tracking-wider">
                  CURRENT LOCATION
                </span>
              </div>

              {/* Facility Markers */}
              {facilities.map((f, idx) => {
                const isSelected = selectedFacilityIndex === idx;
                const leftPos = f?.coordinates?.x ?? 50;
                const topPos = f?.coordinates?.y ?? 50;

                return (
                  <button
                    key={f.id || `fac_${idx}`}
                    onClick={() => setSelectedFacilityIndex(idx)}
                    style={{
                      left: `${leftPos}%`,
                      top: `${topPos}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-[#0A1620] border-curx-cyan shadow-[0_0_20px_rgba(0,240,208,0.3)] scale-110 z-20"
                        : "bg-black/60 border-white/15 hover:border-white/40 z-10 opacity-75"
                    }`}
                  >
                    <Building2
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-curx-cyan" : "text-slate-400"
                      }`}
                    />
                    <span className="text-[10px] font-mono text-white whitespace-nowrap hidden sm:inline">
                      {f.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-curx-cyan">
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Geographic Care Network Active</span>
              </span>
              <span className="text-[10px] uppercase text-slate-400 flex items-center gap-2">
                <span>{locationLabel}</span>
                <button
                  onClick={() => fetchFacilities(userCoords.lat, userCoords.lon)}
                  title="Refresh nearby facilities"
                  className="hover:text-curx-cyan transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </span>
            </div>
          </div>

          {/* Right Facility Information Card */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-6">
                <span className="px-2.5 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] uppercase font-semibold">
                  {current.tier}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {current.distance}
                </span>
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-2">
                {current.name}
              </h3>
              <p className="text-xs text-curx-cyan font-mono mb-4">
                {current.specialty}
              </p>

              <div className="space-y-3 pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Facility Type:</span>
                  <span className="text-white">{current.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estimated Drive:</span>
                  <span className="text-white">{current.travelTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Operating Status:</span>
                  <span className="text-curx-cyan font-semibold">{current.status}</span>
                </div>
                {current.address && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Address:</span>
                    <span className="text-slate-200 truncate max-w-[200px]" title={current.address}>
                      {current.address}
                    </span>
                  </div>
                )}
                {current.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-slate-300">{current.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-sans text-slate-400 leading-relaxed">
                Curx prepares an exportable, structured Clinical Risk Summary that can be handed directly to treating physicians at check-in.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Facility {String(selectedFacilityIndex + 1).padStart(2, "0")} of {String(Math.max(1, facilities.length)).padStart(2, "0")}
              </span>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-curx-cyan/10 hover:bg-curx-cyan/20 border border-curx-cyan/40 text-curx-cyan font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>EXPORT SUMMARY</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
