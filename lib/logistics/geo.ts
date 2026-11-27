import { KM_PER_MILE } from './config';

const EARTH_RADIUS_KM = 6371.0088;

type LatLng = { lat: number; lng: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle (straight-line) distance between two points, in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const milesToKm = (miles: number) => miles * KM_PER_MILE;

/** Estimated road distance: straight-line × road factor. Always present it as an estimate. */
export const roadKm = (straightLineKm: number, roadFactor: number) => straightLineKm * roadFactor;

export const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
