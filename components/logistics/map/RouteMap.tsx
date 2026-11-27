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
  { key: 'returner', marker: 'R', role: 'Returner', color: '#202e28', anchorX: 24 },
  { key: 'buyer', marker: 'B', role: 'Buyer', color: '#3e624a', anchorX: 0 },
  { key: 'warehouse', marker: 'W', role: 'Warehouse', color: '#6b7368', anchorX: 12 },
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
          color: '#5f665c', weight: 4, dashArray: '7 8',
        }).addTo(map),
        reroute: leaflet.polyline([from, to], { color: '#3e624a', weight: 5 }).addTo(map),
      };

      const stops = { returner, buyer, warehouse };
      for (const { key, marker, role, color, anchorX } of markerStyles) {
        const point = stops[key];
        const label = `${role} · ${point.label}`;
        const badge = document.createElement('span');
        badge.className = 'grid size-6 place-items-center border-2 border-[#fffdf8] text-[10px] font-bold text-[#fffdf8]';
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
    <section aria-labelledby="route-map-heading" className="min-w-0 overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Straight-line estimate</p>
          <h2 id="route-map-heading" className="mt-1.5 text-2xl font-semibold tracking-[-0.04em]">Route map</h2>
        </div>
        <div role="group" aria-label="Highlight a route" className="flex flex-wrap border border-[var(--line)]">
          {routeChoices.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={highlight === value}
              disabled={status !== 'ready'}
              onClick={() => setHighlight(value)}
              className="min-h-10 border-r border-[var(--line)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] transition-colors last:border-r-0 hover:bg-[var(--soft)] hover:text-[var(--ink)] disabled:opacity-50 aria-pressed:bg-[var(--accent)] aria-pressed:text-[var(--on-accent)] sm:px-3.5"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative isolate border-y border-[var(--line)]">
        <div
          ref={mapElement}
          className="h-[24rem] min-h-0 w-full sm:h-[30rem]"
          style={{
            backgroundColor: 'var(--soft)',
            backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          role="region"
          aria-label="Map of the returner, buyer and warehouse routes"
        />
        {status !== 'ready' && (
          <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-[var(--muted)]">
            {status === 'loading' ? 'Loading route map…' : 'Map unavailable. The route comparison is still available.'}
          </p>
        )}
      </div>

      {status === 'ready' && tilesUnavailable && (
        <p role="status" className="border-b border-[var(--line)] bg-[var(--warn-bg)] px-5 py-3 text-sm text-[var(--warn)] sm:px-6">
          Base map tiles could not fully load. Routes and stops are still shown.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] sm:px-6">
        <ul aria-label="Route legend" className="flex flex-wrap gap-x-4 gap-y-2">
          <li className="flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-2 border-dashed border-[var(--muted)]" /> Via warehouse</li>
          <li className="flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-[3px] border-[var(--olive)]" /> RIP direct</li>
        </ul>
        <ul aria-label="Stop legend" className="flex flex-wrap items-center gap-3">
          {markerStyles.map(({ key, marker, role, color }) => (
            <li key={key} className="flex items-center gap-1.5">
              <span aria-hidden="true" style={{ backgroundColor: color }} className="grid size-5 place-items-center border border-[var(--line)] text-[10px] font-bold text-[#fffdf8]">{marker}</span>
              {role}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
