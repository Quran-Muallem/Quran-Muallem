# Mobile Release (iOS & Android) mit Capacitor

App-ID **`quran.muallem`** (vorher `com.hifz.quran.ai`: einen alten `android/`- bzw. `ios/`-Ordner einmal löschen und mit `npx cap add android` / `npx cap add ios` neu anlegen, sonst bleibt die alte ID drin), App-Name **„Quran Muallem - معلم القرآن“**, Untertitel „Learn Quran with the help of AI“ (`capacitor.config.ts`, Store-Einträge in `fastlane/metadata/`); unter dem Icon „Quran Muallem“ (Android `strings.xml`, iOS `CFBundleDisplayName`).

Die App nutzt einen eigenen statischen Build (`vite.capacitor.config.ts` → `dist-app/`), weil Capacitor keine
Server-Seiten ausführen kann. Die Web-Version (`bun run build`, TanStack Start) bleibt davon unberührt.

## Voraussetzungen

- Node 22+ und Bun (oder npm)
- iOS: macOS mit Xcode 15+, CocoaPods (`sudo gem install cocoapods`)
- Android: Android Studio Otter (2025.2) oder neuer mit Android SDK 36, JDK 21 (Capacitor 8, Ziel-API 36 für Google Play)

## Einmalig: native Projekte anlegen

```sh
bun install
cp .env.example .env.local        # optional (Einladungslink)
bun run build:app                 # Web-Assets für die App → dist-app/
npx cap add ios                   # nur auf dem Mac
npx cap add android
node scripts/native-permissions.mjs   # Berechtigungen eintragen (siehe unten)
```

## Bei jeder Änderung

```sh
bun run cap:sync      # = bun run build:app && npx cap sync && node scripts/native-permissions.mjs
npx cap open ios      # Xcode öffnen → Signing → Run / Archive
npx cap open android  # Android Studio → Run / Build → Generate Signed Bundle
```

Kurzformen: `bun run cap:ios`, `bun run cap:android`.

## Berechtigungen (setzt `scripts/native-permissions.mjs` automatisch)

**iOS – `ios/App/App/Info.plist`**

| Schlüssel | Text |
|---|---|
| `NSMicrophoneUsageDescription` | تطبيق حفظ القرآن يحتاج إلى الميكروفون لتحليل وتسميع التلاوة المباركة. |
| `NSSpeechRecognitionUsageDescription` | يستخدم التطبيق التعرّف على الكلام لمتابعة تلاوتك كلمةً كلمة. |
| `NSLocationWhenInUseUsageDescription` | يحتاج التطبيق إلى موقعك لحساب اتجاه القبلة بدقة. لا يغادر موقعك جهازك. |
| `NSMotionUsageDescription` | يستخدم التطبيق مستشعرات الحركة لعرض بوصلة القبلة. |

Zusätzlich `CFBundleLocalizations` (ar, en) und „nur iPhone“.

**Android – `android/app/src/main/AndroidManifest.xml`**

`INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `VIBRATE`
(+ optionale Hardware-Features Mikrofon/Kompass/GPS). Die Werbe-ID-Berechtigung (`AD_ID`) wird ausdrücklich entfernt,
`versionCode`/`versionName` kommen aus `package.json` (`androidVersionCode`, `version`).

## Manuelle Schritte

- **App-Icon & Splash:** z. B. mit `npx @capacitor/assets generate` aus einem 1024×1024-Logo.

## Hinweise zur Spracherkennung in der App

Die Live-Erkennung des Browsers (Web Speech API) gibt es in den App-WebViews (Android WebView, iOS WKWebView)
in der Regel nicht. Die App nutzt dort automatisch Whisper direkt auf dem Gerät (kostenlos, ohne Schlüssel) und – wenn aktiviert –
die Live-Aktualisierung alle 4 Sekunden.

## Store-Screenshots

- **Google Play:** 8 Handy-Screenshots 1080 × 1920 (9:16) pro Sprache + Feature-Grafik 1024 × 500 (Pflicht).
- **App Store:** 8 Screenshots pro Sprache für „iPhone mit Dynamic Island (mittel)“ 1206 × 2622 (Pflicht) und „groß“ 1320 × 2868.
- **Nur iPhone:** `scripts/native-permissions.mjs` setzt `TARGETED_DEVICE_FAMILY = 1`. Dann verlangt Apple keine iPad-Screenshots;
  auf dem iPad läuft die App im iPhone-Modus.

## Capacitor 8 / Ziel-API 36

Google Play verlangt für neue Apps Ziel-API-Ebene 36 (Android 16). Das Projekt nutzt deshalb Capacitor 8
(`targetSdkVersion = 36`, `compileSdkVersion = 36`, `minSdkVersion = 24`) und braucht **JDK 21**
(Android Studio → Settings → Build Tools → Gradle → Gradle JDK = 21). Es gibt **keinen Login** und keine Login-SDKs:
beim ersten Start wird nur ein Name eingegeben, deshalb nutzt die App keine Werbe-ID.

Umstieg eines bestehenden Projekts (einmalig, im Projektordner):

    rm -rf node_modules package-lock.json android
    npm install
    npm run build:app
    npx cap add android
    npm run cap:sync

Danach in `android/app/build.gradle` `versionCode` für jeden neuen Upload um 1 erhöhen.

## Hintergrund-Wiedergabe (ab v15)

Die Rezitation der Sheikhs läuft bei ausgeschaltetem Bildschirm weiter:
- **Android:** `native/android/BackgroundAudioPlugin.java` + `BackgroundAudioService.java` werden von `scripts/native-permissions.mjs` (läuft in `cap:sync` und in der GitHub-Action) ins `android/`-Projekt kopiert und in `MainActivity` registriert; dazu die Berechtigungen `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `POST_NOTIFICATIONS` und der `<service … foregroundServiceType="mediaPlayback">`.
- **Play Console:** Für `FOREGROUND_SERVICE_MEDIA_PLAYBACK` verlangt Google unter *App-Inhalte → Berechtigungen für Dienste im Vordergrund* eine Erklärung: Typ „Medienwiedergabe“, Beschreibung z. B. „Die Koran-Rezitation des gewählten Sheikhs spielt weiter, wenn der Bildschirm aus ist; Steuerung über die Benachrichtigung“, plus ein kurzes Video (Wiedergabe starten → Bildschirm aus → Ton läuft weiter → Benachrichtigung).
- **iOS:** `UIBackgroundModes` → `audio` in `Info.plist` (setzt dasselbe Skript).
