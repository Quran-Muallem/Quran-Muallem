# Quran Muallem - معلم القرآن (`quran.muallem`)

*Learn Quran with the help of AI*

Quran-Lern-App: Mus'haf al-Madina, Tasmīʿ und Hifz mit Live-Markierung, 10 Rezitatoren mit Offline-Download,
Offline-Tajwīd-Leitfaden und Offline-Qibla. **Komplett serverlos und local-first:** alle Daten bleiben auf dem Gerät,
Spracherkennung läuft zu 100 % auf dem Gerät (Whisper, kein Cloud-Dienst), **kein KI-Chat** – die App bleibt dauerhaft kostenlos.

## Schnellstart

```sh
bun install            # oder: npm install
cp .env.example .env.local   # optional: Einladungslink
bun run dev            # Web-Version (TanStack Start) → http://localhost:8080
bun run test           # Unit-Tests (vitest)
```

Mobile Apps (iOS/Android): siehe [DEPLOY.md](./DEPLOY.md).

## Funktionen & Dateien

| Bereich | Dateien |
|---|---|
| Startbildschirm + Name eingeben (kein Login) | `src/components/SplashScreen.tsx`, `src/components/WelcomeModal.tsx`, `src/lib/authService.ts` |
| Spracherkennung auf dem Gerät (Whisper tiny/base, Transformers.js, Web Worker) | `src/lib/whisper.ts`, `src/lib/whisper.worker.ts`, `src/components/WhisperModelStatus.tsx`, `scripts/copy-ort-wasm.mjs`, `scripts/fetch-whisper-model.mjs` |
| Tajwīd-Leitfaden offline: 6 Kategorien, Suche (Arabisch/Englisch), Beispiele mit hervorgehobenen Buchstaben | `src/data/tajweedData.ts`, `src/components/TajweedGuide.tsx` |
| Fortschritt, Streaks, Wiederholung, Backup | `src/lib/progressStorage.ts`, `src/components/Dashboard.tsx` |
| Koran-Text 114 Suren (Quran.com v4, Offline-Cache) | `src/lib/quranService.ts`, `src/lib/useQuran.ts` |
| 10 Scheichs, Streaming & Offline-Download | `src/lib/reciterManager.ts`, `src/lib/useAyahPlayer.ts`, `src/components/ReciterSelector.tsx` |
| Mus'haf-Leser seitenweise wie im Buch (604 Seiten, 15 Zeilen), Tasmīʿ/Hifz direkt auf der Seite | `src/components/MushafReader.tsx`, `src/components/mushaf/*`, `src/lib/mushafData.ts`, `src/lib/useRecitation.ts`, `src/lib/usePagePlayer.ts`, `public/mushaf/*.json` |
| Tasmīʿ/Hifz mit Live-Markierung | `src/routes/index.tsx`, `src/lib/quranMatcher.ts`, `src/lib/practiceResults.ts` |
| Hinweis: Tafsīr und Fatwas nur bei Gelehrten | `src/components/TajweedGuide.tsx` (`ScholarNotice`), Nutzungsbedingungen § 5 |
| Offline-Qibla-Kompass | `src/lib/qibla.ts`, `src/components/QiblaCompass.tsx` |
| Suren-Abzeichen (Silber = gelesen, Gold = per Stimme rezitiert ≥ 90 %), 114 Symbole | `src/lib/badges.ts`, `src/lib/surahBadges.ts`, `src/lib/badgeIconData.ts` (aus `scripts/build-badge-icons.mjs`), `src/components/badges/*` |
| Tägliche Adhkar (Morgen, Abend, nach dem Gebet, Schlaf) mit Zähler, Haptik und Tages-Reset, offline | `src/data/adhkar.json`, `src/lib/adhkar.ts`, `src/components/AdhkarTab.tsx` |
| App-Icon & Splash (aus `assets/`), Name „Quran Muallem - معلم القرآن“ | `assets/*`, `assets/native/*`, `public/icon-*.png` – werden von `npm run cap:sync` ins Android/iOS-Projekt kopiert |
| Themes Grün / Hell / Dunkel | `src/styles.css` (`html[data-theme]`), Auswahl in Einstellungen |
| Tägliche Ermutigungs-Ayah | `src/lib/dailyAyah.ts` (nur Fundstellen; Text aus den Mus'haf-Daten), `src/components/DailyAyah.tsx` |
| Freunde einladen (WhatsApp, Instagram, Facebook, Telegram, X, E-Mail, SMS) | `src/lib/invite.ts`, `src/components/InviteDialog.tsx` – Link über `VITE_INVITE_URL` |
| Capacitor (iOS/Android) | `capacitor.config.ts`, `vite.capacitor.config.ts`, `app/index.html`, `src/app-main.tsx`, `scripts/native-permissions.mjs` |

## Khatma, Hintergrund-Audio, Bedienung (v15)

- **Khatma** – `src/components/KhatmaView.tsx` + `src/lib/khatmaStorage.ts` (Preferences-Schlüssel `hifz.khatma.v1`): Tilawa- und Hifz-Khatma getrennt, Ziel in Tagen / Seiten pro Tag / Juz pro Tag, Fortschritt nach Seiten, Juz und Suren (aus dem Mushaf-Layout), „Wird von heute“ mit einem Tipp, „bis Seite …“, Rückgängig, Verlauf.
- **Hintergrund-Audio** – `src/lib/audioPlayback.ts`: ein gemeinsames `<audio>`-Element, Media Session (Sperrbildschirm), Android-Vordergrunddienst `native/android/` (siehe DEPLOY.md).
- **Menü** überall (Burger oben), **Wochenleiste** ab Montag (M T W T F S S / ن ث ر خ ج س ح), **„Wort zeigen“** ohne Limit, **automatisches Umblättern** beim Rezitieren im Mushaf (Mikrofon läuft weiter), **Vibration** bei roten/orangen Wörtern (`src/lib/useMistakeHaptics.ts`), im Tasmīʿ **Mikrofon über dem Surennamen** und **Auto-Scroll** zum aktuellen Wort.

## Abzeichen, einheitliche Modi, PWA (v18)
- **Modi in beiden Ansichten gleich**: `READING` (Lesen – Text sichtbar; Mushaf „Lesen“, Rezitieren „Lesen“) und `MEMORIZATION` (Auswendig – Text verborgen). Zuordnung: `unifiedMode()` in `src/context/RecitationContext.tsx`.
- **Silber** = jedes Wort der ganzen Sure im Lesemodus abgeschlossen (grün/orange). **Gold** = jedes Wort der ganzen Sure auswendig abgeschlossen (ohne „Wort zeigen“). Beides unabhängig voneinander.
  - Wörter werden pro Modus und pro Mushaf-Wort gesammelt, über Seiten, Sitzungen und beide Ansichten hinweg (`src/lib/badges.ts`, Version 2).
  - Geprüft wird **nur**, wenn das letzte Wort der Sure abgeschlossen wird (`RecitationContext.finishSurah` → `completeSurah`). Kein Timer, kein „Seite lange genug offen“, keine Genauigkeits-Abkürzung mehr. Alte, zeitbasierte Lese-Daten werden verworfen; bereits verdiente Abzeichen bleiben.
  - `src/context/BadgeContext.tsx`: Provider/Hook für Abzeichen. `src/components/MushafView.tsx` / `ReciteView.tsx`: Einstiegspunkte der beiden Ansichten.
- **Installierbare Web-App (PWA, GitHub Pages, iOS-Homescreen)**: `bun run build:pwa` → `dist-app/` mit `manifest.webmanifest`, Service Worker `sw.js`, `precache.json`, `404.html`, `.nojekyll`.
  - Beim ersten Start werden App, Mushaf-Daten und Phonem-Lexikon gespeichert; danach lädt der Service Worker das Sprachmodell (~70 MB) in den Cache → Rezitation komplett offline.
  - GitHub Actions: `.github/workflows/pages.yml` (Settings → Pages → Source „GitHub Actions“). Das Modell (72 MB) liegt unter dem 100-MB-Dateilimit von GitHub; Git LFS ist optional.
  - In den iOS/Android-Apps wird kein Service Worker registriert.

## Sprachen, Sure-Abschluss, durchgehende Sitzung (v17)
- **13 Sprachen** (Arabisch, Englisch, Deutsch, Französisch, Türkisch, Urdu, Indonesisch, Malaiisch, Spanisch, Russisch, Bengalisch, Albanisch, Bosnisch): Auswahl oben in der Kopfzeile, im Burger-Menü, im Willkommensdialog und in den Einstellungen. Jede Sprache in eigener Schrift; Arabisch und Urdu von rechts nach links. Die Wahl wird gespeichert.
  - Wörterbücher: `src/i18n/locales/<code>.json` (maschinell übersetzt, ungeprüft). Fehlt ein Text, erscheint Englisch.
  - Tajwīd-Leitfaden, Adhkār-Erklärungen und Rechtstexte sind noch Arabisch/Englisch (andere Sprachen zeigen Englisch). Rechtstexte lassen sich als `legal/<doc>.<code>.md` ergänzen → `npm run legal`.
- **Sure abgeschlossen**: Ist das letzte Wort einer Sure gelesen (und der Großteil der Sure erkannt), stoppt das Mikrofon, es gibt `Haptics.notification(Success)` und einen leisen Gong (Web Audio, keine Datei).
- **RecitationContext** (`src/context/RecitationContext.tsx`): Mushaf-Seite, Wortfarben, Hinweise und die Tasmīʿ-Transkription bleiben beim Tab-Wechsel erhalten; richtige/falsche Wörter werden über automatische Seitenwechsel hinweg addiert.

## Tasmīʿ-Pipeline (100 % offline)

Standard-Engine seit v13: **Quran-Lab Zipformer** (Phoneme, Hafs), Rückfall: Whisper.

1. **Audio** – `src/lib/record-wav.ts` (AudioWorklet, 16 kHz mono, rollender Puffer) → `src/lib/audioPipeline.ts`: `VadGate` (Stille am Anfang weg, Pausen auf 0,6 s gekürzt, adaptive Schwelle) und `KaldiFbank` (80 Kanäle, Povey-Fenster, 20–7600 Hz, snip_edges=false – exakt wie k2/sherpa-onnx).
2. **Akustik** – `src/lib/zipformerEngine.ts` + `zipformer.worker.ts` + `zipformerCore.ts`: `public/models/zipformer_p_arabic_v3.1.int8.onnx` mit onnxruntime-web 1.14 (WASM; WebGPU nur, wenn die ORT-Version es anbietet), Streaming in Blöcken von 61 Frames (Vorschub 48 = 0,48 s), 98 Zustands-Tensoren, Greedy-CTC (Blank = 250), keine Sprachmodelle.
3. **Abgleich** – `src/lib/quranAlignment.ts`: gewichtete Levenshtein-Ausrichtung (diskretes DTW) der erkannten Phoneme gegen die Hafs-Phoneme jedes Mushaf-Worts (`public/models/quran_phonemes.json`); Wortzustände MATCHED/NEAR/WRONG_WORD/PENDING (= CORRECT/WARNING/ERROR/PENDING); Madd-/Ghunna-Länge getrennt bewertet; Hifz zeigt nur richtig rezitierte Wörter.
4. **Anpassung** – `src/lib/userAdaptation.ts`: Varianten (Text oder Phoneme), Akzent-Tausch, Strenge, Tempo, Genauigkeit pro Sure.

Lizenz der Modelldateien: **NPL-1.2** (`public/models/LICENSE-NPL-1.2.txt`) – die App muss kostenlos und werbefrei bleiben. `quran_phonemes.json` neu bauen: `node scripts/build-phonemes.mjs` (Quelle `models-src/ordered_quran_phonemes.json`).

## Eigene Aufnahmen, Sprachprofil, Sheikh-Auswahl

- Nach jedem Tasmīʿ wird die Aufnahme komprimiert (Opus/AAC, MediaRecorder ohne Timeslice) **nur auf dem Gerät** gespeichert: App → `@capacitor/filesystem` (Directory.Data/recordings), Web → IndexedDB (`src/lib/audioStorage.ts`). Pro Sure + Versbereich eine Aufnahme, max. 200.
- `src/components/RecitationPlayerBar.tsx`: Timer beim Aufnehmen · eigene Aufnahme abspielen · löschen (zweimal tippen). Verse mit Aufnahme haben einen roten Punkt im Mushaf.
- **Mein Sprachprofil** (`src/lib/userAdaptation.ts`, IndexedDB `quran_user_voice_profile`): rot markierte Wörter antippen → „Zu meinem Sprachprofil hinzufügen“; gelernte Varianten, Strenge, Sprechtempo und Genauigkeit pro Sure – nur lokal.
- Sheikh-Auswahl: im Mushaf als Monogramm-Avatar in der unteren Leiste (nur Symbole, kein Text), im Tasmīʿ als `ReciterPill`; `ReciterSelectModal` mit Suche und Offline-Status. Der Sheikh ist global (Einstellungen); ein Wechsel spielt die aktuelle Āya mit der neuen Stimme weiter.

## Aufnahme & Spracherkennung (Diagnose)

- In der Android/iOS-App läuft das Tasmīʿ immer mit Whisper auf dem Gerät (`src/lib/speechEngine.ts`); „Automatisch“ bedeutet dort Whisper mit Live-Anzeige.
- Aufnahme im Audio-Thread (AudioWorklet, Fallback ScriptProcessor), fortlaufender 16-kHz-Puffer, Pausen beenden nichts (`src/lib/record-wav.ts`).
- Live-Anzeige über ein rollendes Fenster von max. 24 s, an einer Pause geschnitten (`src/lib/use-transcribing-recorder.ts`); Warteschlange: neueste Live-Anfrage gewinnt, Endergebnis zuerst (`src/lib/whisper.ts`).
- Protokoll in der Konsole (Dauer, Größe, Rechenzeit): in Entwicklungs-Builds automatisch, sonst `localStorage.setItem("hifz.debug.audio", "1")`. Android: Chrome → `chrome://inspect`, iOS: Safari → Entwickler. Wenn `seconds` deutlich kleiner als `wallSeconds` ist, gehen Audio-Blöcke verloren.

## Datenschutz & Kosten

- **Kein eigener Server, keine Datenbank.** Profil, Fortschritt, Einstellungen und Aufnahmen liegen in
  `@capacitor/preferences` (App) bzw. `localStorage` (Browser); Koran-Text im IndexedDB-Cache; Audio-Downloads
  im App-Datenordner (`@capacitor/filesystem`).
- **Lokales E-Mail-Konto:** nur ein PBKDF2-SHA256-Hash wird gespeichert, kein Passwort; es gibt keine
  Wiederherstellung und keine Synchronisierung (dafür: JSON-Backup in den Einstellungen).
- **Spracherkennung:** Whisper läuft auf dem Gerät; Audio verlässt das Gerät nie. Das Modell wird einmalig von Hugging Face geladen (≈ 75 MB base / ≈ 40 MB tiny) und gecacht – oder mit `npm run models:whisper` fest in die App gepackt.
- **Keine externen KI-Dienste:** kein Groq, kein OpenAI, keine API-Schlüssel. Ein Test (`recitationAudio.test.ts`) prüft, dass keine solche Adresse im Quellcode steht.
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
