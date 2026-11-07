import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "quran.muallem",
  appName: "Quran Muallem - معلم القرآن",
  // Static build of the app (see vite.capacitor.config.ts): `bun run build:app`
  webDir: "dist-app",
  backgroundColor: "#022c22",
  android: {
    allowMixedContent: false,
  },
  ios: {
    // Safe areas are handled in CSS (viewport-fit=cover + env(safe-area-inset-*)).
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    // Android 16 (target SDK 36) always draws edge to edge. "native" pads the WebView on old WebViews and
    // otherwise follows viewport-fit=cover, so the app's env(safe-area-inset-*) CSS keeps working.
    SystemBars: { insetsHandling: "native", style: "DARK" },
  },
};

export default config;
