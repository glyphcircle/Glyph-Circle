/**
 * Extracts the file ID from various Google Drive URL formats.
 */
export function extractDriveFileId(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  // Regex to match /d/ID/ or ?id=ID or open?id=ID
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || 
                url.match(/id=([a-zA-Z0-9-_]+)/) || 
                url.match(/open\?id=([a-zA-Z0-9-_]+)/);
                
  return match ? match[1] : url; 
}

/**
 * Converts a Drive File ID back into a direct stream URL.
 */
export function toDriveEmbedUrl(id: string): string {
  if (!id) return '';
  // If it's already a full URL (not just an ID), return as is
  if (id.startsWith('http')) return id;
  return `https://drive.google.com/uc?id=${id}`;
}
