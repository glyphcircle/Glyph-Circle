// services/biometricService.ts
// Web Authentication API (WebAuthn) — works on Chrome, Safari, Edge, Firefox
// Supports: Fingerprint, Face ID, Windows Hello, Android biometrics

import { supabase } from './supabaseClient';

// ── Helpers: ArrayBuffer ↔ Base64 ─────────────────────────────────────────
const bufToBase64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const base64ToBuf = (b64: string): ArrayBuffer => {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
};

// ── Check support ─────────────────────────────────────────────────────────
export const isBiometricSupported = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// ── Check if user already has biometrics enrolled ────────────────────────
export const hasBiometricEnrolled = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_biometric_keys')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return !!data;
};

// ─────────────────────────────────────────────────────────────────────────
// ENROLLMENT — called once after first email/password login
// ─────────────────────────────────────────────────────────────────────────
export const enrollBiometric = async (
  userId: string,
  userEmail: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Generate a random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // 2. Ask browser to create a WebAuthn credential
    //    This triggers the fingerprint / Face ID prompt
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Glyph Circle',
          id: window.location.hostname,       // e.g. "localhost" or "glyphcircle.com"
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },     // ES256 (preferred)
          { type: 'public-key', alg: -257 },    // RS256 (fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',   // device-only, no USB keys
          userVerification: 'required',   // forces biometric check
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',                    // no attestation needed
      },
    }) as PublicKeyCredentialWithAttestationResponse | null;

    if (!credential) throw new Error('Credential creation cancelled');

    const credResponse = (credential as any).response;

    // 3. Save credential ID + public key to Supabase
    const { error } = await supabase
      .from('user_biometric_keys')
      .insert({
        user_id: userId,
        credential_id: bufToBase64(credential.rawId),
        public_key: bufToBase64(credResponse.getPublicKey()),
        device_name: getDeviceName(),
      });

    if (error) throw error;

    // 4. Save credential ID locally so we can retrieve it on login
    localStorage.setItem(`biometric_cred_${userId}`, bufToBase64(credential.rawId));

    return { success: true };

  } catch (err: any) {
    console.error('[Biometric] Enrollment failed:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric access denied or cancelled.' };
    }
    return { success: false, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────
// AUTHENTICATION — called on subsequent logins
// ─────────────────────────────────────────────────────────────────────────
export const authenticateWithBiometric = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Get the stored credential ID for this user
    const storedCredId = localStorage.getItem(`biometric_cred_${userId}`);
    if (!storedCredId) {
      return { success: false, error: 'No biometric registered on this device.' };
    }

    // 2. Generate a fresh challenge (prevents replay attacks)
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // 3. Ask browser to sign the challenge — triggers fingerprint/Face ID
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: [{
          type: 'public-key',
          id: base64ToBuf(storedCredId),
          transports: ['internal'],          // 'internal' = on-device biometrics
        }],
      },
    }) as PublicKeyCredentialWithAssertionResponse | null;

    if (!assertion) throw new Error('Authentication cancelled');

    // 4. Verify on client side:
    //    In production → send assertion to your backend for full cryptographic verify
    //    For Supabase-only setup → we trust device verification + fetch the session

    // 5. Update last_used_at
    await supabase
      .from('user_biometric_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('credential_id', storedCredId);

    return { success: true };

  } catch (err: any) {
    console.error('[Biometric] Authentication failed:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric check cancelled or failed.' };
    }
    return { success: false, error: err.message };
  }
};

// ── Remove biometric enrollment ───────────────────────────────────────────
export const removeBiometric = async (userId: string): Promise<void> => {
  await supabase
    .from('user_biometric_keys')
    .delete()
    .eq('user_id', userId);
  localStorage.removeItem(`biometric_cred_${userId}`);
};

// ── Utility ───────────────────────────────────────────────────────────────
const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS Safari';
  if (/Android/.test(ua)) return 'Android Chrome';
  if (/Windows/.test(ua)) return 'Windows Hello';
  if (/Mac/.test(ua)) return 'Mac Touch ID';
  return 'Unknown Device';
};

// TypeScript type helpers (not exported by lib.dom.d.ts by default)
interface PublicKeyCredentialWithAttestationResponse extends PublicKeyCredential {
  response: AuthenticatorAttestationResponse & { getPublicKey(): ArrayBuffer };
}
interface PublicKeyCredentialWithAssertionResponse extends PublicKeyCredential {
  response: AuthenticatorAssertionResponse;
}
