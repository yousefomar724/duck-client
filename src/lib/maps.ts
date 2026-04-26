/**
 * Open Google Maps at coordinates. Display a label in the UI next to the link.
 */
export function buildGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lng}`,
  )}`
}
