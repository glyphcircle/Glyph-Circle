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

  // Return full URL as-is (no extraction)
  return url.trim();
}

/**
 * Converts a Drive File ID or full URL into an embeddable/viewable URL.
 * Handles both:
 * - Full URLs (returns as-is or converts /view to /uc?id=)
 * - Short IDs (converts to /uc?id= format)
 */
export function toDriveEmbedUrl(urlOrId: string): string {
  if (!urlOrId) return '';

  const trimmed = urlOrId.trim();

  // Already a full URL
  if (trimmed.startsWith('http')) {
    // If it's a /file/d/ format, extract ID and convert to embed
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/uc?id=${match[1]}`;
    }
    // Return as-is (already embeddable or custom URL)
    return trimmed;
  }

  // Short ID - convert to embed URL
  return `https://drive.google.com/uc?id=${trimmed}`;
}

/**
 * Validates if a string is a valid Google Drive URL or ID
 */
export function isValidDriveUrl(url: string): boolean {
  if (!url) return false;

  const trimmed = url.trim();

  // Check if it's a full Google Drive URL
  if (trimmed.includes('drive.google.com')) return true;

  // Check if it looks like a Drive ID (alphanumeric + - and _)
  return /^[a-zA-Z0-9_-]{20,}$/.test(trimmed);
}