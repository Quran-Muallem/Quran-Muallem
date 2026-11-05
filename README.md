# Quran Muallem - معلم القرآن (`quran.muallem`)

*Learn Quran with the help of AI*

Quran-Lern-App: Mus'haf al-Madina, Tasmīʿ und Hifz mit Live-Markierung, 10 Rezitatoren mit Offline-Download,
KI-Muʿallim und Offline-Qibla. **Komplett serverlos und local-first:** alle Daten bleiben auf dem Gerät,
Spracherkennung läuft komplett auf dem Gerät (Whisper), der KI-Muʿallim kostenlos über Groq (kostenloser Schlüssel, optional eigener OpenAI-Schlüssel) – die App bleibt dauerhaft kostenlos.

## Schnellstart

```sh
bun install            # oder: npm install
cp .env.example .env.local   # optional: Einladungslink, Groq-Schlüssel
bun run dev            # Web-Version (TanStack Start) → http://localhost:8080
bun run test           # Unit-Tests (vitest)
```

Mobile Apps (iOS/Android): siehe [DEPLOY.md](./DEPLOY.md).

## Funktionen & Dateien

| Bereich | Dateien |
|---|---|
| Startbildschirm + Name eingeben (kein Login) | `src/components/SplashScreen.tsx`, `src/components/WelcomeModal.tsx`, `src/lib/authService.ts` |
| Spracherkennung auf dem Gerät (Whisper tiny/base, Transformers.js, Web Worker) | `src/lib/whisper.ts`, `src/lib/whisper.worker.ts`, `src/components/WhisperModelStatus.tsx`, `scripts/copy-ort-wasm.mjs`, `scripts/fetch-whisper-model.mjs` |
| KI-Muʿallim – Groq (gratis) oder OpenAI, Schlüssel nur auf dem Gerät | `src/lib/apiKeys.ts`, `src/lib/muallim.ts`, `src/components/MuallimChat.tsx`, `src/components/SettingsModal.tsx` |
| Fortschritt, Streaks, Wiederholung, Backup | `src/lib/progressStorage.ts`, `src/components/Dashboard.tsx` |
| Koran-Text 114 Suren (Quran.com v4, Offline-Cache) | `src/lib/quranService.ts`, `src/lib/useQuran.ts` |
| 10 Scheichs, Streaming & Offline-Download | `src/lib/reciterManager.ts`, `src/lib/useAyahPlayer.ts`, `src/components/ReciterSelector.tsx` |
| Mus'haf-Leser seitenweise wie im Buch (604 Seiten, 15 Zeilen), Tasmīʿ/Hifz direkt auf der Seite | `src/components/MushafReader.tsx`, `src/components/mushaf/*`, `src/lib/mushafData.ts`, `src/lib/useRecitation.ts`, `src/lib/usePagePlayer.ts`, `public/mushaf/*.json` |
| Tasmīʿ/Hifz mit Live-Markierung | `src/routes/index.tsx`, `src/lib/quranMatcher.ts`, `src/lib/practiceResults.ts` |
| KI-Muʿallim mit Fatwa-Hinweis | `src/lib/muallim.ts`, `src/components/MuallimChat.tsx` |
| Offline-Qibla-Kompass | `src/lib/qibla.ts`, `src/components/QiblaCompass.tsx` |
| App-Icon & Splash (aus `assets/`), Name „Quran Muallem - معلم القرآن“ | `assets/*`, `assets/native/*`, `public/icon-*.png` – werden von `npm run cap:sync` ins Android/iOS-Projekt kopiert |
| Themes Grün / Hell / Dunkel | `src/styles.css` (`html[data-theme]`), Auswahl in Einstellungen |
| Tägliche Ermutigungs-Ayah | `src/lib/dailyAyah.ts` (nur Fundstellen; Text aus den Mus'haf-Daten), `src/components/DailyAyah.tsx` |
| Freunde einladen (WhatsApp, Instagram, Facebook, Telegram, X, E-Mail, SMS) | `src/lib/invite.ts`, `src/components/InviteDialog.tsx` – Link über `VITE_INVITE_URL` |
| Capacitor (iOS/Android) | `capacitor.config.ts`, `vite.capacitor.config.ts`, `app/index.html`, `src/app-main.tsx`, `scripts/native-permissions.mjs` |

## Datenschutz & Kosten

- **Kein eigener Server, keine Datenbank.** Profil, Fortschritt, Einstellungen und Chatverlauf liegen in
  `@capacitor/preferences` (App) bzw. `localStorage` (Browser); Koran-Text im IndexedDB-Cache; Audio-Downloads
  im App-Datenordner (`@capacitor/filesystem`).
- **Lokales E-Mail-Konto:** nur ein PBKDF2-SHA256-Hash wird gespeichert, kein Passwort; es gibt keine
  Wiederherstellung und keine Synchronisierung (dafür: JSON-Backup in den Einstellungen).
- **Spracherkennung:** Whisper läuft auf dem Gerät; Audio verlässt das Gerät nie. Das Modell wird einmalig von Hugging Face geladen (≈ 75 MB base / ≈ 40 MB tiny) und gecacht – oder mit `npm run models:whisper` fest in die App gepackt.
- **KI-Muʿallim:** Groq (`openai/gpt-oss-20b`, kostenloser Plan; `llama-3.1-8b-instant` ist seit 16.08.2026 nur noch für Enterprise verfügbar) oder OpenAI – direkt vom Gerät mit dem Schlüssel des Nutzers. Optional `VITE_GROQ_API_KEY` als eingebauter Schlüssel (siehe Warnung in `.env.example`).
- **Mus'haf-Seiten:** Seiten- und Zeilenaufteilung des Madina-Mus'hafs (QPC V2, 1421 H) und Uthmani-Text pro Wort sind in `public/mushaf/` enthalten (≈ 350 KB gzip) – Quelle: [zonetecde/mushaf-layout](https://github.com/zonetecde/mushaf-layout), abgeleitet von Quran.com. Neu erzeugen mit `scripts/build-mushaf-data.py`.
- **Externe kostenlose Quellen:** `api.quran.com` (Text), `api.alquran.cloud` (Ersatzquelle), `everyayah.com`
  (Audio pro Vers), `mp3quran.net` (ganze Suren).

## Kein Login

Die App hat bewusst **keine Anmeldung**: Beim ersten Start gibt man nur einen Namen ein (optional), alles bleibt auf
dem Gerät. Ohne Google-, Apple- oder Facebook-SDK gibt es keine Werbe-ID und nichts, was Google Play beim Datenschutz
bemängeln könnte. Der Name lässt sich oben über das Profil-Menü ändern.

## Rechtstexte

Datenschutzerklärung und Nutzungsbedingungen liegen zweisprachig (Englisch/Arabisch) in `legal/*.md`.
Nach Änderungen an den Texten `npm run legal` ausführen. Das erzeugt
`src/lib/legalTexts.ts` (Anzeige in der App: Einstellungen → Rechtliches und im Login-Fenster) und
`public/legal/{privacy,terms}.html`: zweisprachige Seiten für die Datenschutz-URL, die Google Play und
der App Store verlangen (z. B. über die Web-Version oder GitHub Pages veröffentlichen). Hinweis: Die Texte sind ein
sorgfältiger Entwurf und ersetzen keine anwaltliche Prüfung.

## Release-Name

Voller Name **„Quran Muallem - معلم القرآن“**, Untertitel **„Learn Quran with the help of AI“** (arabisch:
„تعلّم القرآن بمساعدة الذكاء الاصطناعي“): `capacitor.config.ts` (appName), `src/lib/assets.ts` (`APP_NAME`, `APP_SUBTITLE`),
GitHub-Release „Quran Muallem - معلم القرآن – Android Test-APK“ und die Store-Einträge in
`fastlane/metadata/` (Titel 27/30 Zeichen; iOS-Untertitel max. 30 Zeichen, daher dort gekürzt: „Learn Quran with AI's help“ / „تعلم القرآن بالذكاء الاصطناعي“; Kurz- und Langbeschreibung auf Arabisch und Englisch).
Unter dem Icon auf dem Homescreen steht die Kurzform **„Quran Muallem“** (`APP_LAUNCHER_NAME`, Android `strings.xml`,
iOS `CFBundleDisplayName` per `scripts/native-permissions.mjs`), weil Launcher längere Namen abschneiden.
