export type ParsedEmbedUrl = {
  lat: number | null;
  lng: number | null;
  zoom: number | null;
  query: string | null;
  mapType: 'roadmap' | 'satellite' | null;
};

/**
 * Extract a Google Maps embed URL from either a raw URL string or an <iframe> snippet.
 */
function extractUrl(input: string): string | null {
  const trimmed = input.trim();

  // If it looks like an iframe tag, extract the src attribute
  if (trimmed.startsWith('<iframe') || trimmed.startsWith('<IFRAME')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  // Otherwise treat it as a raw URL
  if (trimmed.includes('google.com/maps/embed')) {
    return trimmed;
  }

  return null;
}

function parsePbParameter(pb: string): ParsedEmbedUrl {
  const result: ParsedEmbedUrl = {
    lat: null,
    lng: null,
    zoom: null,
    query: null,
    mapType: null,
  };

  const fields = pb.split('!').filter(Boolean);

  for (const field of fields) {
    if (field.length < 3) continue;
    const fieldNum = field[0];
    const dataType = field[1];
    const value = field.substring(2);

    if (dataType === 'd') {
      const num = parseFloat(value);
      if (isNaN(num)) continue;
      // !2d = longitude, !3d = latitude
      if (fieldNum === '2' && result.lng === null) {
        result.lng = num;
      } else if (fieldNum === '3' && result.lat === null) {
        result.lat = num;
      }
    } else if (dataType === 's') {
      if (fieldNum === '1' && value) {
        result.query = decodeURIComponent(value);
      }
    } else if (dataType === 'e') {
      if (fieldNum === '5') {
        result.mapType = parseInt(value, 10) === 1 ? 'satellite' : 'roadmap';
      }
    }
  }

  // Estimate zoom from viewport span (!1d field)
  const spanField = fields.find((f) => f[0] === '1' && f[1] === 'd');
  if (spanField) {
    const span = parseFloat(spanField.substring(2));
    if (!isNaN(span) && span > 0) {
      result.zoom = Math.max(1, Math.min(21, Math.round(Math.log2(360 / span))));
    }
  }

  return result;
}

/**
 * Parse a Google Maps embed URL or iframe snippet.
 * Returns null if the input is not a valid Google Maps embed.
 */
export function parseEmbedUrl(input: string): ParsedEmbedUrl | null {
  if (!input) return null;
  const url = extractUrl(input);
  console.log('url', url);
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pb = urlObj.searchParams.get('pb');
    if (!pb) return null;
    return parsePbParameter(pb);
  } catch {
    return null;
  }
}
