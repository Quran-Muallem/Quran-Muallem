/**
 * Local profile for Quran Muallem - معلم القرآن.
 *
 * There is no login and no account: on the first start the user only enters a name (optional).
 * The profile lives only on this device (Capacitor Preferences in the app, localStorage in the browser).
 * No sign-in SDKs (Google, Apple, Facebook) are included, so the app collects no advertising ID.
 */
import { kv, kvStore } from "@/lib/storage";

/** "local" for profiles created by name; older builds also stored "guest", "email", "google", "apple", "facebook". */
export type AuthProvider = "local" | "guest" | "email" | "google" | "apple" | "facebook";

export type UserSession = {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  /** ISO timestamp of when this profile was created on the device. */
  signedInAt: string;
};

export const MAX_NAME_LENGTH = 40;
const KEY = "hifz.auth.session";

export { isNativePlatform, platform } from "@/lib/storage";

/* ------------------------------------------------------------------ */
/* Profile state (observable)                                          */
/* ------------------------------------------------------------------ */

export type AuthState =
  | { status: "loading"; session: null }
  | { status: "signedOut"; session: null }
  | { status: "signedIn"; session: UserSession };

let state: AuthState = { status: "loading", session: null };
const listeners = new Set<(s: AuthState) => void>();
let restorePromise: Promise<AuthState> | null = null;

const emit = (next: AuthState) => { state = next; listeners.forEach((l) => l(state)); };

export const getAuthState = (): AuthState => state;

export function onAuthStateChange(listener: (s: AuthState) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const isSession = (v: unknown): v is UserSession => {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s["userId"] === "string" && typeof s["name"] === "string" && typeof s["provider"] === "string";
};

/** Loads the saved profile once (call on app start). Safe to call repeatedly. */
export function restoreSession(): Promise<AuthState> {
  restorePromise ??= kv.getJson<unknown>(KEY, null).then((saved) => {
    emit(isSession(saved) ? { status: "signedIn", session: { ...saved, email: null, avatarUrl: null } } : { status: "signedOut", session: null });
    return state;
  }).catch(() => { emit({ status: "signedOut", session: null }); return state; });
  return restorePromise;
}

/** Cleans up a typed name: trims, collapses spaces, limits the length. */
export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** First start: creates the local profile. The name is optional. */
export async function startWithName(name: string): Promise<UserSession> {
  const session: UserSession = {
    userId: `local:${uuid()}`,
    name: cleanName(name),
    email: null,
    avatarUrl: null,
    provider: "local",
    signedInAt: new Date().toISOString(),
  };
  await kv.setJson(KEY, session);
  restorePromise = Promise.resolve({ status: "signedIn", session });
  emit({ status: "signedIn", session });
  return session;
}

/** Changes the name shown in the app. */
export async function updateProfile(patch: { name: string }): Promise<UserSession | null> {
  if (state.status !== "signedIn") return null;
  const session: UserSession = { ...state.session, name: cleanName(patch.name) };
  await kv.setJson(KEY, session);
  emit({ status: "signedIn", session });
  return session;
}

/** Removes the profile from this device (used by "Delete all my data"). */
export async function signOut(): Promise<void> {
  try { await (await kvStore()).remove(KEY); } catch { /* storage unavailable */ }
  restorePromise = Promise.resolve({ status: "signedOut", session: null });
  emit({ status: "signedOut", session: null });
}
