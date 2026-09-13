/**
 * FCM web-config helpers — pure and DOM-free so they run in the node jest
 * environment: JSON parsing of NEXT_PUBLIC_FIREBASE_CONFIG and the
 * mandatory-field guard the SDK initialisation needs.
 */
import { extractFirebaseConfig, isFirebaseConfigured } from '@/lib/fcm/config';

describe('extractFirebaseConfig', () => {
  const valid = {
    apiKey: 'AIza...',
    authDomain: 'prinzex.firebaseapp.com',
    projectId: 'prinzex-demo',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcd',
  };

  test('accepts a complete config JSON string', () => {
    expect(extractFirebaseConfig(JSON.stringify(valid))).toEqual(valid);
  });

  test('rejects missing, malformed and partial configs', () => {
    expect(extractFirebaseConfig('')).toBeNull();
    expect(extractFirebaseConfig('not json')).toBeNull();
    expect(extractFirebaseConfig(undefined)).toBeNull();
    expect(extractFirebaseConfig(JSON.stringify({ apiKey: 'x' }))).toBeNull(); // partial
    expect(extractFirebaseConfig(JSON.stringify({ ...valid, projectId: '' }))).toBeNull();
  });

  test('isFirebaseConfigured guards the mandatory fields', () => {
    expect(isFirebaseConfigured(valid)).toBe(true);
    expect(isFirebaseConfigured(null)).toBe(false);
    expect(isFirebaseConfigured({ ...valid, appId: '' })).toBe(false);
  });
});
