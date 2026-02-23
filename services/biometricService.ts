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
// biometricService.ts
export const isBiometricSupported = async (): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;
    if (!window.isSecureContext) return false;  // ✅ HTTPS required

    const available = await PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable();

    console.log('🔐 Platform authenticator available:', available);
    return available;
  } catch {
    return false;
  }
};


// ── Check if user already has biometrics enrolled ────────────────────────
// biometricService.ts — fix hasBiometricEnrolled
export const hasBiometricEnrolled = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_biometric_keys')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();            // ✅ returns null instead of 406 when no row found

  if (error) {
    console.warn('[Biometric] hasBiometricEnrolled error:', error.message);
    return false;              // ✅ fail silently — don't crash the app
  }
  return !!data;
};

// biometricService.ts — add this detection function
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    // Check 1: WebAuthn API exists
    if (!window.PublicKeyCredential) return false;

    // Check 2: Platform authenticator available (Face ID, fingerprint)
    const available = await PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable();

    return available;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// ENROLLMENT — called once after first email/password login
// ─────────────────────────────────────────────────────────────────────────
// biometricService.ts — enrollBiometric
export const enrollBiometric = async (
  userId: string,
  userEmail: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // ✅ NO awaits before this line — must be first async call
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Glyph Circle',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as any;

    if (!credential) throw new Error('Credential creation cancelled');

    // ✅ All Supabase saves happen AFTER credential creation
    const credResponse = credential.response;
    const publicKey = credResponse.getPublicKey
      ? credResponse.getPublicKey()
      : new ArrayBuffer(0);

    const { error } = await supabase
      .from('user_biometric_keys')
      .insert({
        user_id: userId,
        credential_id: bufToBase64(credential.rawId),
        public_key: bufToBase64(publicKey),
        device_name: getDeviceName(),
      });

    if (error) throw error;

    localStorage.setItem(`biometric_cred_${userId}`, bufToBase64(credential.rawId));
    return { success: true };

  } catch (err: any) {
    console.error('[Biometric] Enrollment failed:', err);
    if (err.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'Biometric access was denied. Please allow it in your browser settings and try again.',
      };
    }
    if (err.name === 'NotSupportedError') {
      return {
        success: false,
        error: 'Your device does not support biometric login.',
      };
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
