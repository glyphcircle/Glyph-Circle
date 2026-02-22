import { supabase } from './supabaseClient';

export interface CloudProvider {
  id?: string;
  name?: string;
  provider?: string;
  api_key?: string;
  folder_id?: string;
  bucket_name?: string;
  is_active?: boolean;
  status?: string;
}

class CloudManager {

  // ─────────────────────────────────────────────
  // CORE: Extract Drive File ID from ANY URL format
  // ─────────────────────────────────────────────
  private extractDriveFileId(url: string): string | null {
    if (!url) return null;

    // Format: /file/d/FILE_ID/view  ← most common share link
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (fileDMatch) return fileDMatch[1];

    // Format: ?id=FILE_ID or &id=FILE_ID  ← uc?export, thumbnail
    const qIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (qIdMatch) return qIdMatch[1];

    // Format: /folders/FILE_ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (folderMatch) return folderMatch[1];

    return null;
  }

  // ─────────────────────────────────────────────
  // PRIMARY: Convert ANY Drive URL → thumbnail API
  // This is the ONLY working embed method in 2026
  // ─────────────────────────────────────────────
  toEmbeddableUrl(url: string): string {
    if (!url || !url.trim()) return url;
    const trimmed = url.trim();

    // Not a Drive URL — return as-is
    if (!trimmed.includes('drive.google.com')) return trimmed;

    // Already correct thumbnail format — return as-is
    if (trimmed.includes('drive.google.com/thumbnail')) return trimmed;

    const fileId = this.extractDriveFileId(trimmed);
    if (!fileId) {
      console.warn('⚠️ [CloudManager] Could not extract file ID from:', trimmed);
      return trimmed;
    }

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // ─────────────────────────────────────────────
  // resolveImage — used everywhere in the app
  // Handles ALL URL types: Drive, ImgBB, Unsplash, etc.
  // ─────────────────────────────────────────────
  resolveImage(url: string | undefined): string {
    if (!url) return this.getFallbackImage();

    const trimmed = url.trim();
    if (!trimmed) return this.getFallbackImage();

    // ✅ ImgBB — always works, return as-is
    if (trimmed.includes('i.ibb.co') || trimmed.includes('ibb.co')) {
      return trimmed;
    }

    // ✅ Already correct thumbnail API — return as-is
    if (trimmed.includes('drive.google.com/thumbnail')) {
      return trimmed;
    }

    // ✅ lh3 Google user content — still works
    if (trimmed.includes('lh3.googleusercontent.com')) {
      return trimmed;
    }

    // ✅ Any other non-Drive HTTP URL (Unsplash, CDN, etc.)
    if (trimmed.startsWith('http') && !trimmed.includes('drive.google.com')) {
      return trimmed;
    }

    // ✅ Any Drive URL variant → convert to thumbnail API
    if (trimmed.includes('drive.google.com')) {
      const fileId = this.extractDriveFileId(trimmed);
      if (fileId) {
        console.log('🖼️ [CloudManager] Resolving Drive ID:', fileId);
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
    }

    // ✅ Bare file ID (25+ alphanumeric chars, no slashes)
    const bareIdMatch = trimmed.match(/^([a-zA-Z0-9_-]{25,})$/);
    if (bareIdMatch) {
      console.log('🖼️ [CloudManager] Resolving bare Drive ID:', bareIdMatch[1]);
      return `https://drive.google.com/thumbnail?id=${bareIdMatch[1]}&sz=w1000`;
    }

    console.warn('⚠️ [CloudManager] Could not resolve URL:', url);
    return this.getFallbackImage();
  }

  // ─────────────────────────────────────────────
  // Fallback image when nothing else works
  // ─────────────────────────────────────────────
  getFallbackImage(): string {
    return 'https://images.unsplash.com/photo-1615529182904-14819d19f5d4?w=400&h=300&fit=crop';
  }

  // ─────────────────────────────────────────────
  // Save cloud provider config to Supabase
  // ─────────────────────────────────────────────
  async saveProvider(provider: CloudProvider): Promise<void> {
    const payload = {
      ...provider,
      status: provider.is_active ? 'active' : 'inactive',
      updated_at: new Date().toISOString(),
    };

    if (provider.id) {
      const { error } = await supabase
        .from('cloud_providers')
        .update(payload)
        .eq('id', provider.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cloud_providers')
        .insert(payload);
      if (error) throw error;
    }
  }

  // ─────────────────────────────────────────────
  // Get active provider from DB
  // ─────────────────────────────────────────────
  async getActiveProvider(): Promise<CloudProvider | null> {
    const { data, error } = await supabase
      .from('cloud_providers')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[CloudManager] Failed to get provider:', error);
      return null;
    }
    return data;
  }
}

export const cloudManager = new CloudManager();
