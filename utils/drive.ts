/**
 * Google Drive URL utilities
 * 🔧 EXTRACTION DISABLED - Stores full URLs to fix RLS 400 errors
 */

/**
 * Extracts the file ID from various Google Drive URL formats.
 * TEMPORARILY DISABLED - Returns full URL instead
 */
export function extractDriveFileId(url: string): string {
  if (!url) return '';
  console.log('🔧 [Drive] EXTRACTION DISABLED - Storing full URL');
  return url.trim();
}

/**
 * Converts a Drive File ID or full URL into a direct image stream URL.
 * Uses lh3.googleusercontent.com which is the most reliable for web embeds.
 */
export function toDriveEmbedUrl(urlOrId: string): string {
  if (!urlOrId) return '';

  const trimmed = urlOrId.trim();

  // Robust regex to capture ID from all known Drive URL patterns
  const idMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                  trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/\/d\/([a-zA-Z0-9_-]+)\//);

  if (idMatch && idMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }

  // If it's already an absolute HTTP URL but no ID found, return as is
  if (trimmed.startsWith('http')) {
    return trimmed;
  }

  // Fallback: Assume the string is a raw ID if it looks like one
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }

  return trimmed;
}

/**
 * Validates if a string is a valid Google Drive URL or ID
 */
export function isValidDriveUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) return true;
  return /^[a-zA-Z0-9_-]{20,}$/.test(trimmed);
}
