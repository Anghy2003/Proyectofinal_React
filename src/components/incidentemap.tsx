import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

import "../styles/incident-heatmap.css";

import type { IncidenteResponseDTO } from "../services/incidentesService";

function toNum(v: any) {
  if (typeof v === "string") {
    const cleaned = v.trim().replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractLatLng(i: any): [number, number] | null {
  const latDirect =
    i.lat ??
    i.latitud ??
    i.latitude ??
    i.ubicacionLat ??
    i?.ubicacion?.lat ??
    i?.ubicacion?.latitude;

  const lngDirect =
    i.lng ??
    i.longitud ??
    i.longitude ??
    i.ubicacionLng ??
    i?.ubicacion?.lng ??
    i?.ubicacion?.longitude;

  const lat1 = toNum(latDirect);
  const lng1 = toNum(lngDirect);
  if (Number.isFinite(lat1) && Number.isFinite(lng1)) return [lat1, lng1];

  // GeoJSON MongoDB: [lng, lat]
  const coords =
    i?.ubicacion?.coordinates ??
    i?.location?.coordinates ??
    i?.geo?.coordinates ??
    i?.coordenadas ??
    i?.coordinates;

  if (Array.isArray(coords) && coords.length >= 2) {
    const lng2 = toNum(coords[0]);
    const lat2 = toNum(coords[1]);
    if (Number.isFinite(lat2) && Number.isFinite(lng2)) return [lat2, lng2];
  }

  return null;
}

function getWeight(i: any): number {
  const w = Number(i.gravedad ?? i.prioridad ?? i.riesgo ?? 1);
  return Math.min(Math.max(w / 5, 0.4), 1);
}

/* ===============================
   Heat layer + auto zoom
   =============================== */
function HeatLayer({ incidentes }: { incidentes: IncidenteResponseDTO[] }) {
  const map = useMap();
  const heatRef = useRef<any>(null);
  const didAutoFitRef = useRef(false);

  const points = useMemo(() => {
    return incidentes
      .map((i) => {
        const p = extractLatLng(i);
        if (!p) return null;
        // 🔥 sube un poco la base del weight para que pinte más
        const w = Math.min(Math.max(getWeight(i) * 1.15, 0.55), 1);
        return [p[0], p[1], w] as [number, number, number];
      })
      .filter(Boolean) as [number, number, number][];
  }, [incidentes]);

  //calcula opciones según zoom (lejos: más radius y más opacidad)
  const applyHeatOptionsForZoom = () => {
    const z = map.getZoom();
    const far = z <= 6;
    const mid = z > 6 && z <= 9;

    heatRef.current?.setOptions({
      radius: far ? 70 : mid ? 50 : 34,
      blur: far ? 30 : mid ? 24 : 18,
      minOpacity: far ? 0.62 : mid ? 0.5 : 0.38,
      // maxZoom influye en cómo “escala” el heat
      maxZoom: 12,
    });
  };

  useEffect(() => {
    // limpia layer previo
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (!points.length) return;

    // @ts-ignore
    const heat = L.heatLayer(points, {
      // estos son “base”; luego se ajustan con zoomend
      radius: 50,
      blur: 24,
      maxZoom: 12,
      minOpacity: 0.5,
      max: 1.0,
      gradient: {
        0.1: "#2b7bff",
        0.3: "#00e5ff",
        0.55: "#22c55e",
        0.75: "#f59e0b",
        1.0: "#f95150",
      },
    }).addTo(map);

    heatRef.current = heat;

    // ✅ auto-fit solo la primera vez por dataset (como ya haces)
    if (!didAutoFitRef.current) {
      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      didAutoFitRef.current = true;
    }

    // ✅ zoom dinámico
    const onZoom = () => applyHeatOptionsForZoom();
    map.on("zoomend", onZoom);
    applyHeatOptionsForZoom();

    return () => {
      map.off("zoomend", onZoom);
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, points]);

  useEffect(() => {
    didAutoFitRef.current = false;
  }, [incidentes]);

  return null;
}

function HeatHoverLayer({
  incidentes,
}: {
  incidentes: IncidenteResponseDTO[];
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const zones = useMemo(() => {
    const mapZones = new Map<
      string,
      {
        lat: number;
        lng: number;
        total: number;
        tipos: Record<string, number>;
      }
    >();

    incidentes.forEach((i) => {
      const p = extractLatLng(i);
      if (!p) return;

      // 🔹 redondeo para agrupar por zona (≈ 10–15m)
      const lat = Number(p[0].toFixed(4));
      const lng = Number(p[1].toFixed(4));
      const key = `${lat}|${lng}`;

      if (!mapZones.has(key)) {
        mapZones.set(key, {
          lat,
          lng,
          total: 0,
          tipos: {},
        });
      }

      const z = mapZones.get(key)!;
      z.total += 1;
      const tipo = i.tipo || "Sin tipo";
      z.tipos[tipo] = (z.tipos[tipo] || 0) + 1;
    });

    return Array.from(mapZones.values());
  }, [incidentes]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const group = L.layerGroup();

    zones.forEach((z) => {
      // ✅ Ordena tipos por cantidad (mayor a menor)
      const tiposOrdenados = Object.entries(z.tipos).sort(
        (a, b) => b[1] - a[1],
      );

      // ✅ Construye lista (Top 10 opcional)
      const tiposHtml = tiposOrdenados
        .slice(0, 10) // cambia 10 por 5 si quieres más compacto
        .map(
          ([tipo, n]) => `
      <div class="heat-row">
        <span class="heat-pill">${tipo}</span>
        <span class="heat-count">${n}</span>
      </div>
    `,
        )
        .join("");

      // ✅ Un solo cuadro: total + tipos con conteo
      const html = `
  <div class="heat-card">
    <div class="heat-card__title">Zona de incidentes</div>

    <div class="heat-card__meta">
      <div><span class="heat-label">Total de reportes:</span> <b>${z.total}</b></div>
      <div class="heat-sub">${z.lat}, ${z.lng}</div>
    </div>

    <div class="heat-divider"></div>

    <div class="heat-card__section">
      <div class="heat-sec-title">Tipos de reportes</div>
      ${tiposHtml || `<div class="heat-empty">Sin datos</div>`}
    </div>
  </div>
`;

      const marker = L.circleMarker([z.lat, z.lng], {
        radius: 18,
        fillOpacity: 0,
        stroke: false,
        interactive: true,
      });

      marker.bindTooltip(html, {
        direction: "top",
        className: "heat-tooltip",
        sticky: true,
        opacity: 1,
      });

      group.addLayer(marker);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
    };
  }, [map, zones]);

  return null;
}

type FocusPoint = {
  id: string;
  lat: number;
  lng: number;
  total: number;
};

export default function IncidentHeatmap({
  incidentes = [],
  focusPoints = [],
  focusIndex = 0,
}: {
  incidentes: IncidenteResponseDTO[];
  focusPoints?: FocusPoint[];
  focusIndex?: number;
}) {
  return (
    <MapContainer
      center={[-0.1807, -78.4678]}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatLayer incidentes={incidentes} />
      <HeatHoverLayer incidentes={incidentes} />

      <FocusController focusPoints={focusPoints} focusIndex={focusIndex} />
    </MapContainer>
  );
}

function FocusController({
  focusPoints,
  focusIndex,
}: {
  focusPoints: FocusPoint[];
  focusIndex: number;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!focusPoints?.length) return;

    const idx = Math.max(0, Math.min(focusIndex, focusPoints.length - 1));
    const p = focusPoints[idx];
    if (!p) return;

    const targetZoom = Math.max(map.getZoom(), 16);
    map.flyTo([p.lat, p.lng], targetZoom, { duration: 0.8 });

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    markerRef.current = L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: "focus-pin",
        html: `<div class="focus-pin__dot"></div><div class="focus-pin__ring"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      interactive: true,
    })
      .addTo(map)
      .bindTooltip(`Total en esta zona: <b>${p.total}</b>`, {
        direction: "top",
        opacity: 1,
        sticky: true,
        className: "heat-tooltip", // puedes usar tu estilo
      })
      .openTooltip();

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, focusPoints, focusIndex]);

  return null;
}
