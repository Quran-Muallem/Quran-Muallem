import { useEffect, useSyncExternalStore } from "react";
import { getAuthState, onAuthStateChange, restoreSession, type AuthState } from "@/lib/authService";

const LOADING: AuthState = { status: "loading", session: null };

/** Current auth state. Starts as "loading" (also during server rendering) until the saved session is read. */
export function useAuth(): AuthState {
  const state = useSyncExternalStore(onAuthStateChange, getAuthState, () => LOADING);
  useEffect(() => { void restoreSession(); }, []);
  return state;
}
