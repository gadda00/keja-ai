'use client';
/**
 * MapPanel — clustered results map for the marketplace (audit F-12 / P2-4).
 *
 * Loaded via next/dynamic (ssr:false) from PropertiesView, so Leaflet + tiles
 * cost the first load NOTHING — the panel's code, CSS and tile fetches only
 * happen when a user opens the map.
 *
 * One marker per area (price-tiered, count-labelled) — honest at the
 * neighbourhood granularity the data supports. Clicking a marker filters the
 * results list to that area.
 */
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

import { coordFor } from '@/data/areaCoords';
import { formatKES } from '@/lib/format';
import type { Property } from '@/data/properties';

interface AreaCluster {
  area: string;
  county: string;
  lat: number;
  lng: number;
  count: number;
  medianPrice: number;
  monthly: boolean;
}

function buildClusters(properties: Property[]): AreaCluster[] {
  const groups = new Map<string, Property[]>();
  for (const p of properties) {
    const key = `${p.area}|${p.county}`;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const clusters: AreaCluster[] = [];
  for (const [key, list] of groups) {
    const [area, county] = key.split('|');
    const c = coordFor(area, county);
    if (!c) continue;
    const prices = list.map((p) => p.price).sort((a, b) => a - b);
    clusters.push({
      area,
      county,
      lat: c.lat,
      lng: c.lng,
      count: list.length,
      medianPrice: prices[Math.floor(prices.length / 2)],
      monthly: list.some((p) => p.purpose.includes('rent')),
    });
  }
  return clusters.sort((a, b) => b.count - a.count);
}

function priceTier(cluster: AreaCluster): { color: string; label: string } {
  const k = cluster.medianPrice / (cluster.monthly ? 100_000 : 10_000_000);
  if (cluster.monthly) {
    if (k > 1.5) return { color: '#7c2d12', label: 'premium' };
    if (k > 0.8) return { color: '#8a6b1f', label: 'mid' };
    return { color: '#14532d', label: 'value' };
  }
  if (k >= 3) return { color: '#7c2d12', label: 'premium' };
  if (k >= 1) return { color: '#8a6b1f', label: 'mid' };
  return { color: '#14532d', label: 'value' };
}

/** Fit bounds to the clusters once on mount. */
function FitBounds({ clusters }: { clusters: AreaCluster[] }) {
  const map = useMap();
  useEffect(() => {
    if (!clusters.length) return;
    if (clusters.length === 1) {
      map.setView([clusters[0].lat, clusters[0].lng], 13);
      return;
    }
    const lats = clusters.map((c) => c.lat);
    const lngs = clusters.map((c) => c.lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit once per result set
  }, [clusters.length]);
  return null;
}

export default function MapPanel({
  properties,
  onSelectArea,
}: {
  properties: Property[];
  onSelectArea: (area: string) => void;
}) {
  const clusters = useMemo(() => buildClusters(properties), [properties]);

  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="flex items-center justify-between border-b bg-background/60 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-black">
          <MapPin className="h-4 w-4 text-primary" aria-hidden /> Results by area
        </p>
        <p className="text-[11px] text-muted-foreground">
          {clusters.length} areas · click a marker to filter
        </p>
      </div>
      <div className="h-[420px] w-full" role="region" aria-label="Map of listings by area">
        <MapContainer
          center={[-1.2864, 36.8172]}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds clusters={clusters} />
          {clusters.map((c) => {
            const tier = priceTier(c);
            return (
              <CircleMarker
                key={`${c.area}-${c.county}`}
                center={[c.lat, c.lng]}
                radius={Math.min(26, 12 + Math.sqrt(c.count) * 3)}
                pathOptions={{
                  color: tier.color,
                  weight: 2,
                  fillColor: tier.color,
                  fillOpacity: 0.35,
                }}
                eventHandlers={{ click: () => onSelectArea(c.area) }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <span className="font-bold">{c.area}</span> · {c.county}
                  <br />
                  {c.count} listing{c.count > 1 ? 's' : ''} · median{' '}
                  {formatKES(c.medianPrice, { monthly: c.monthly, compact: true })}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
