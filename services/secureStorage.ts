import { securityService } from './security';
import { safeStorageInstance } from './supabaseClient';

export const secureStorage = {
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const stringValue = JSON.stringify(value);
      const encrypted = await securityService.encryptData(stringValue);
      safeStorageInstance.setItem(`secure_${key}`, encrypted);
    } catch (e) {
      console.warn("Secure Storage Write failed.", e);
    }
  },

  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      let raw = safeStorageInstance.getItem(`secure_${key}`);
      if (!raw) return null;
      
      const decrypted = await securityService.decryptData(raw);
      if (!decrypted) return null;
      return JSON.parse(decrypted) as T;
    } catch (e) {
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      safeStorageInstance.removeItem(`secure_${key}`);
    } catch (e) {}
  }
};
