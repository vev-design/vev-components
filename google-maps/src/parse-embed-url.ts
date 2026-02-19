/**
 * Extract a Google Maps embed src URL from either a raw URL string or an <iframe> snippet.
 * Returns null if the input doesn't contain a valid Google Maps embed URL.
 */
export function extractEmbedSrc(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If it looks like an iframe tag, extract the src attribute
  if (/^<iframe/i.test(trimmed)) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (!match) return null;
    const src = match[1];
    return src.includes('google.com/maps') ? src : null;
  }

  // Otherwise treat it as a raw URL
  if (trimmed.includes('google.com/maps')) {
    return trimmed;
  }

  return null;
}

/**
 * Recenter a Google Maps embed URL on new coordinates by replacing the
 * !2d (longitude) and !3d (latitude) fields in the pb= parameter.
 * Returns the original src unchanged if the pb parameter can't be modified.
 */
export function recenterEmbedSrc(
  embedUrl: string,
  lat: number,
  lng: number,
): string | null {
  const src = extractEmbedSrc(embedUrl);
  if (!src) return null;

  try {
    const url = new URL(src);
    const pb = url.searchParams.get('pb');
    if (!pb) return src;

    // Replace the first !2d (lng) and !3d (lat) values in the pb parameter
    let newPb = pb;
    let replacedLng = false;
    let replacedLat = false;

    newPb = newPb.replace(/!2d[-\d.]+/g, (match) => {
      if (!replacedLng) {
        replacedLng = true;
        return `!2d${lng}`;
      }
      return match;
    });

    newPb = newPb.replace(/!3d[-\d.]+/g, (match) => {
      if (!replacedLat) {
        replacedLat = true;
        return `!3d${lat}`;
      }
      return match;
    });

    if (!replacedLng && !replacedLat) return src;

    url.searchParams.set('pb', newPb);
    return url.toString();
  } catch {
    return src;
  }
}


export const extractSearchQuery = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    // 1. Check for the standard 'q' or 'query' parameter
    const directQuery = params.get('q') || params.get('query');
    if (directQuery) return directQuery;

    // 2. Check for the 'pb' parameter (the long encoded string)
    // Most embed URLs look like ...!2s[QUERY_IS_HERE]!5e0...
    const pb = params.get('pb');
    if (pb) {
      // This regex looks for the '2s' marker followed by the location name
      const match = pb.match(/!2s([^!]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};
