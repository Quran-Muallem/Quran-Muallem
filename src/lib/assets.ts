/** URL of a file in /public that works on the web ("/") and in the Capacitor app ("./"). */
export function assetUrl(path: string): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const base = env?.["BASE_URL"] ?? "/";
  return `${base.endsWith("/") ? base : `${base}/`}${path.replace(/^\//, "")}`;
}

/** Full app name (stores, share texts, window title). */
export const APP_NAME = "Quran Muallem - معلم القرآن";
export const APP_NAME_LATIN = "Quran Muallem";
export const APP_NAME_ARABIC = "معلم القرآن";
export const APP_SUBTITLE = "Learn Quran with the help of AI";
export const APP_SUBTITLE_AR = "تعلّم القرآن بمساعدة الذكاء الاصطناعي";
/** Label under the home-screen icon: launchers cut names after ~12 characters, so the short form is used there. */
export const APP_LAUNCHER_NAME = "Quran Muallem";
export const APP_ID = "quran.muallem";
