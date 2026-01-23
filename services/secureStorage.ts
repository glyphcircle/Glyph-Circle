
import { securityService } from './security';

// Secure Storage Wrapper
// Replaces localStorage with an encrypted layer

export const secureStorage = {
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const stringValue = JSON.stringify(value);
      const encrypted = await securityService.encryptData(stringValue);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.error("Secure Storage Write Error", e);
    }
  },

  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const decrypted = await securityService.decryptData(raw);
      if (!decrypted) return null;

      return JSON.parse(decrypted) as T;
    } catch (e) {
      console.error("Secure Storage Read Error", e);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  // Fallback to standard storage for non-sensitive data if needed
  setItemPlain: (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  
  getItemPlain: (key: string) => {
    return localStorage.getItem(key);
  }
};
