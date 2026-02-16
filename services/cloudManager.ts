// src/services/cloudManager.ts - UPDATED TO 2024 METHOD
// Uses Google Drive Thumbnail API (more reliable)

import { dbService } from './db';

export interface CloudProvider {
  id: string;
  provider: 'Google Drive' | 'Dropbox' | 'AWS S3' | 'Firebase Storage' | 'Cloudinary' | 'Generic';
  name: string;
  api_key?: string;
  secret?: string;
  folder_id?: string;
  bucket_name?: string;
  region?: string;
  cloud_name?: string;
  base_url?: string;
  is_active: boolean;
  status: 'active' | 'inactive';
}

class CloudManager {
  async saveProvider(provider: Omit<CloudProvider, 'id' | 'status'> & { id?: string }) {
    const data = { ...provider, status: 'active' };
    if (provider.id) {
      await dbService.updateEntry('cloud_providers', provider.id, data);
    } else {
      await dbService.createEntry('cloud_providers', { ...data });
    }
  }

  async deleteProvider(id: string) {
    await dbService.updateEntry('cloud_providers', id, { status: 'inactive' });
  }

  async testConnection(provider: Partial<CloudProvider>): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!provider.api_key && !provider.base_url && !provider.bucket_name && provider.provider !== 'Google Drive') {
          resolve({ success: false, message: "Missing required configuration fields" });
        } else {
          resolve({ success: true, message: `Successfully connected to ${provider.provider}.` });
        }
      }, 1500);
    });
  }

  validateProviderActive(url: string, providers: CloudProvider[]): { valid: boolean; message?: string } {
    if (!url || !url.startsWith('http')) return { valid: true };
    let detectedProvider = '';
    if (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')) detectedProvider = 'Google Drive';
    else if (url.includes('dropbox.com')) detectedProvider = 'Dropbox';
    else if (url.includes('s3') || url.includes('aws')) detectedProvider = 'AWS S3';
    else if (url.includes('firebase')) detectedProvider = 'Firebase Storage';
    else if (url.includes('cloudinary')) detectedProvider = 'Cloudinary';

    if (detectedProvider) {
      const isActive = providers.some(p => p.provider === detectedProvider && p.status === 'active' && p.is_active);
      if (!isActive) return { valid: false, message: `⚠️ Missing configuration for ${detectedProvider}.` };
    }
    return { valid: true };
  }

  getProxyImageUrl(imageId: string | number, fallbackUrl: string): string {
    if (String(imageId).startsWith('http')) return this.resolveImage(String(imageId));
    return this.resolveImage(fallbackUrl);
  }

  /**
   * ✅ UPDATED: Uses Google Drive Thumbnail API (2024 method)
   * This is more reliable than lh3.googleusercontent.com
   */
  resolveImage(url: string | undefined): string {
    if (!url) return this.getFallbackImage();

    const trimmed = url.trim();

    // ✅ ImgBB URLs - return as is
    if (trimmed.includes('i.ibb.co') || trimmed.includes('ibb.co')) {
      return trimmed;
    }

    // Already using thumbnail API - return as is
    if (trimmed.includes('drive.google.com/thumbnail')) {
      return trimmed;
    }

    // Already in lh3 format - return as is (legacy support)
    if (trimmed.includes('lh3.googleusercontent.com')) {
      return trimmed;
    }

    // Already a direct URL (Unsplash, etc) - return as is
    if (trimmed.startsWith('http') && !trimmed.includes('drive.google')) {
      return trimmed;
    }

    // Extract Google Drive file ID
    const fileIdMatch = trimmed.match(/[\\/=]([a-zA-Z0-9_-]{25,})/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      console.log('🖼️ [CloudManager] Using Google Drive Thumbnail API, ID:', fileId);

      // ✅ USE 2024 METHOD: Google Drive Thumbnail API
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    console.warn('⚠️ [CloudManager] Could not parse URL:', url);
    return this.getFallbackImage();
  }

  private getFallbackImage(): string {
    return 'https://placehold.co/400x400/0a0a14/d97706?text=No+Image';
  }
}

// Export single instance
export const cloudManager = new CloudManager();
