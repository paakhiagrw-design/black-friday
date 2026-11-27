'use client';

import type { LatLngTuple, Map as LeafletMap, Polyline } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@/lib/logistics/types';

type RouteMapProps = {
  returner: GeoPoint;
  buyer: GeoPoint;
  warehouse: GeoPoint;
};

const toLatLng = ({ lat, lng }: GeoPoint): LatLngTuple => [lat, lng];

const markerStyles = [
  { key: 'returner', marker: 'R', role: 'Returner', color: '#0f172a', anchorX: 24 },
  { key: 'buyer', marker: 'B', role: 'Buyer', color: '#047857', anchorX: 0 },
  { key: 'warehouse', marker: 'W', role: 'Warehouse', color: '#475569', anchorX: 12 },
] as const;

const routeChoices = [
  { value: 'both', label: 'Both routes' },
  { value: 'warehouse', label: 'Via warehouse' },
  { value: 'reroute', label: 'RIP direct' },
] as const;

export default function RouteMap({ returner, buyer, warehouse }: RouteMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const routeLines = useRef<{ warehouse: Polyline; reroute: Polyline } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [highlight, setHighlight] = useState<(typeof routeChoices)[number]['value']>('both');

  useEffect(() => {
    const container = mapElement.current;
    if (!container) return;

    let mounted = true;
    let map: LeafletMap | undefined;
    let tileTimeout: number | undefined;

    void import('leaflet').then((leaflet) => {
      if (!mounted) return;

      const from = toLatLng(returner);
      const to = toLatLng(buyer);
      const via = toLatLng(warehouse);
      const routeMap = leaflet.map(container, { scrollWheelZoom: false, zoomSnap: 0.25 });
      map = routeMap;

      let hadTileError = false;
      const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      tiles.on('loading', () => {
        hadTileError = false;
        window.clearTimeout(tileTimeout);
        tileTimeout = window.setTimeout(() => setTilesUnavailable(true), 5000);
      });
      tiles.on('tileerror', () => { hadTileError = true; });
      tiles.on('load', () => {
        window.clearTimeout(tileTimeout);
        setTilesUnavailable(hadTileError);
      });
      tiles.addTo(map);

      routeLines.current = {
        warehouse: leaflet.polyline([from, via, to], {
          color: '#475569', weight: 4, dashArray: '7 8',
        }).addTo(map),
        reroute: leaflet.polyline([from, to], { color: '#047857', weight: 5 }).addTo(map),
      };

      const stops = { returner, buyer, warehouse };
      for (const { key, marker, role, color, anchorX } of markerStyles) {
        const point = stops[key];
        const label = `${role} · ${point.label}`;
        const badge = document.createElement('span');
        badge.className = 'grid size-6 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md';
        badge.style.backgroundColor = color;
        badge.textContent = marker;

        const caption = document.createElement('span');
        caption.textContent = label;

        const mapMarker = leaflet.marker(toLatLng(point), {
          title: label,
          alt: label,
          icon: leaflet.divIcon({
            className: '',
            html: badge,
            iconSize: [24, 24],
            iconAnchor: [anchorX, 12],
            popupAnchor: [12 - anchorX, -12],
          }),
        }).bindPopup(caption).addTo(map);
        mapMarker.getElement()?.setAttribute('aria-label', label);
      }

      const bounds = leaflet.latLngBounds([from, to, via]);
      const fitRoute = () => routeMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      fitRoute();
      routeMap.on('resize', fitRoute);
      setStatus('ready');
    }).catch(() => {
      if (!mounted) return;

      window.clearTimeout(tileTimeout);
      map?.remove();
      map = undefined;
      routeLines.current = null;
      setStatus('unavailable');
    });

    return () => {
      mounted = false;
      window.clearTimeout(tileTimeout);
      map?.remove();
      routeLines.current = null;
    };
  }, [returner, buyer, warehouse]);

  useEffect(() => {
    const lines = routeLines.current;
    if (status !== 'ready' || !lines) return;

    lines.warehouse.setStyle({ opacity: highlight === 'reroute' ? 0.22 : 1, weight: highlight === 'warehouse' ? 6 : 4 });
    lines.reroute.setStyle({ opacity: highlight === 'warehouse' ? 0.22 : 1, weight: highlight === 'reroute' ? 7 : 5 });
    if (highlight === 'warehouse') lines.warehouse.bringToFront();
    else lines.reroute.bringToFront();
  }, [highlight, status]);

  return (
    <section aria-labelledby="route-map-heading" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <h2 id="route-map-heading" className="text-lg font-semibold tracking-tight">Route map</h2>
        <div role="group" aria-label="Highlight a route" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {routeChoices.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={highlight === value}
              disabled={status !== 'ready'}
              onClick={() => setHighlight(value)}
              className="rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-50 aria-pressed:bg-white aria-pressed:text-emerald-900 aria-pressed:shadow-sm sm:px-3"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative isolate border-y border-slate-200">
        <div
          ref={mapElement}
          className="h-[24rem] min-h-0 w-full sm:h-[30rem]"
          style={{
            backgroundColor: '#f1f5f9',
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          role="region"
          aria-label="Map of the returner, buyer and warehouse routes"
        />
        {status !== 'ready' && (
          <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-slate-700">
            {status === 'loading' ? 'Loading route map…' : 'Map unavailable. The route comparison is still available.'}
          </p>
        )}
      </div>

      {status === 'ready' && tilesUnavailable && (
        <p role="status" className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 sm:px-5">
          Base map tiles could not fully load. Routes and stops are still shown.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 text-xs font-medium text-slate-700 sm:px-5">
        <ul aria-label="Route legend" className="flex flex-wrap gap-x-4 gap-y-2">
          <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-dashed border-slate-600" /> Via warehouse</li>
          <li className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t-2 border-emerald-700" /> RIP direct</li>
        </ul>
        <ul aria-label="Stop legend" className="flex flex-wrap items-center gap-3">
          {markerStyles.map(({ key, marker, role, color }) => (
            <li key={key} className="flex items-center gap-1.5">
              <span aria-hidden="true" style={{ backgroundColor: color }} className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white">{marker}</span>
              {role}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
