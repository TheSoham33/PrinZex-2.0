/**
 * FCM web config helpers (gap #10). Pure and DOM-free so jest can exercise
 * them in the node environment. The Firebase *web* config (apiKey, projectId,
 * appId, messagingSenderId) is public by design — it is NOT a secret.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

/** The minimum fields `firebase.initializeApp` needs to enable messaging. */
export function isFirebaseConfigured(
  config: FirebaseWebConfig | null | undefined,
): config is FirebaseWebConfig {
  return (
    !!config &&
    !!config.apiKey &&
    !!config.projectId &&
    !!config.messagingSenderId &&
    !!config.appId
  );
}

/**
 * Parse `NEXT_PUBLIC_FIREBASE_CONFIG` (a JSON object string). Returns null on
 * any malformed/partial input so the app degrades to "no push" instead of
 * half-initialising Firebase.
 */
export function extractFirebaseConfig(raw: unknown): FirebaseWebConfig | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate: FirebaseWebConfig = {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      authDomain: typeof parsed.authDomain === 'string' ? parsed.authDomain : '',
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : '',
      messagingSenderId:
        typeof parsed.messagingSenderId === 'string' ? parsed.messagingSenderId : '',
      appId: typeof parsed.appId === 'string' ? parsed.appId : '',
    };
    return isFirebaseConfigured(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
