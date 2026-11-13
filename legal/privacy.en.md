# Privacy Policy

**App:** Quran Muallem - معلم القرآن (Learn Quran with the help of AI), Android, iOS and web version · **Last updated:** 13 November 2026

Quran Muallem is built as a local-first app. We do not run servers for it, we do not create user accounts on any server, and we do not use analytics, advertising or tracking tools. This policy explains which data the app handles, where it is stored, and which third parties the app contacts on your behalf. It complies with the EU General Data Protection Regulation (GDPR).

## 1. Controller

Oualid Ben Rejeb
E-mail: quranmuallem@gmail.com

The app's server-free design means we (the controller) never receive your personal data. Section 4 lists the third parties that do receive data when you use certain functions.

## 2. Data stored only on your device

All data the app creates is stored **only on your device**, inside the app's private storage (Capacitor Preferences in the Android/iOS app; Local Storage, IndexedDB and Cache Storage in the web version). None of it is sent to servers operated by us. This includes:

| Data | Purpose |
|---|---|
| Your name (optional, as you typed it on the first start) | Greet you in the app |
| Memorization progress, streak, review dates, practice results (accuracy per verse), surah badges, today's adhkar counters | Progress tracking, smart review, badges and adhkar |
| Settings (language, theme, reciter, speech engine) | Your preferences |
| Your own recitation recordings (kept automatically after each recitation; delete them any time in the recitation bar) | Listen back to your recitation |
| Your voice profile: words you added after a misrecognition, your recognition strictness, average recitation speed and accuracy per surah | Adapt the recognition to your voice |
| Last known position for the Qibla compass | Compass works offline |
| Prayer-time settings: your location (GPS coordinates or the city and country you entered), calculation method, madhab, minute offsets, Adhan voice and notification mode per prayer | Calculate prayer times and schedule Adhan notifications |
| Cached Quran text, downloaded recitation audio, translations, tafsir and hadith you opened or downloaded, speech-recognition model files | Offline use |


## 3. Speech recognition (Tasmīʿ)

When you recite, the app uses your microphone **only while recording is switched on**.

- **In the app and in the web version:** recitation is recognised **entirely on your device** by a speech model (Whisper, via Transformers.js / ONNX Runtime using WebAssembly) and compared with the Quran text. A compressed copy of each recitation is **saved only on your device**, so you can listen back to it; you can delete it at any time (recitation bar, or Settings → "Delete all my data"). Audio is **never uploaded** and never used to train AI models. We do not use any cloud speech or AI service.
- **Quran phoneme engine (default):** the app includes the phoneme recognition model of Quran-Lab (Zipformer, trained on Hafs recitation). It runs entirely on your device; nothing is downloaded or uploaded for it. If it cannot run on a device, the app uses Whisper (below).
- **Whisper model download:** the first time you use Whisper, the model files (about 40–120 MB, depending on the model you choose) are downloaded once from Hugging Face (huggingface.co) and cached on your device. No audio is sent with that request. Your IP address is visible to Hugging Face. If the model files are bundled with the app, this download does not happen.

Only the result (which words were recited correctly) is saved as part of your progress.

## 4. Third-party services the app contacts

The app connects directly from your device to the following services only when you use the related function. Each one can see your IP address and the technical data of the request, and processes it under its own privacy policy. Where these providers are located outside the EU (mostly in the USA), data is transferred to a third country. Legal basis: Art. 6(1)(b) GDPR (providing the function you requested) and Art. 6(1)(f) GDPR (our legitimate interest in providing a working app).

### 4.1 Quran text and recitation audio
- **Quran.com API** (api.quran.com) and, as a fallback, **AlQuran Cloud** (api.alquran.cloud): Quran text and surah data. The Madani Mushaf layout and Uthmani text are bundled with the app, so these are needed only rarely.
- **EveryAyah** (everyayah.com, mirrors.quranicaudio.com) and **mp3quran.net**: recitation audio of the reciters, streamed or downloaded when you press play or download.
- **Tajweed guide:** the teaching recitations (e.g. al-Ḥuṣarī and al-Minshāwī "Muʿallim") are loaded from Quran.com (api.qurancdn.com, download.quranicaudio.com) when you play an example.
- **Quran.com** (api.quran.com, verses.quran.com, audio.qurancdn.com): when you tap "Listen to the word" on a marked word, the word timing and the recording of that verse (or the word-by-word recording) are loaded. Only the verse and reciter are requested; no recording of yours is sent.

### 4.2 Translations, tafsir and hadith
- **Quran.com API** (api.quran.com), **AlQuran Cloud** (api.alquran.cloud) and **QuranEnc** (quranenc.com): translations of the meanings of the Quran and tafsir, loaded when you open them.
- **jsDelivr** (cdn.jsdelivr.net) and, as a fallback, **GitHub** (raw.githubusercontent.com): the open data sets for tafsir (spa5k/tafsir_api) and the hadith collections (fawazahmed0/hadith-api).

Only the requested edition, surah, verse or book is requested. What you have loaded is kept on your device. The adhkar of Ḥiṣn al-Muslim are bundled with the app and work offline.

### 4.3 Prayer times
- **With your GPS position**, prayer times are **calculated on your device** (offline). Your coordinates are not sent anywhere.
- **If you enter a city instead**, the city and country name, the date and the calculation method are sent to **Aladhan** (api.aladhan.com) to get that day's times. The result is cached on your device.

### 4.4 Sharing and invitations
If you invite friends, the app opens your device's share sheet or the app/website you choose (WhatsApp, Instagram, Facebook, Telegram, X, e-mail, SMS). Only the invitation text you send is passed on.

## 5. Offline functions and location

- The **Mushaf reader** works fully offline with the bundled page data. Audio playback needs a connection unless you downloaded the recitation.
- The **Qibla compass** uses your device's GPS/location services and magnetometer. The direction and the distance to the Kaaba are **calculated on your device**. Your GPS position is never sent anywhere and never used for tracking. The last position is saved on your device so the compass also works offline.
- **Adhan notifications** are scheduled **locally** by your device's operating system (Android: exact alarms and a notification channel per Adhan recording; iOS: local notifications). There is no push server; nothing is sent to us or to anyone else. The Adhan recordings are bundled with the app.
- Location, microphone and notification access are requested through the operating system's permission dialog. You can revoke them at any time in your device settings (Art. 6(1)(a) GDPR).

## 6. No tracking, no ads, no profiling

The app contains no advertising, no analytics or crash-reporting SDKs, no tracking cookies and no profiling. We do not sell or share data.

## 7. Your rights and control

Because your data is on your device, you control it directly:
- **Access and export:** Settings → Progress backup → Export creates a JSON file of your progress, which you can import on another device (Art. 15 and 20 GDPR).
- **Correction:** change your name and settings in the app (Art. 16).
- **Deletion:** Settings → "Delete all my data" removes your profile, progress, recordings, voice profile, prayer settings and cached files from the device. Uninstalling the app or clearing its data in the system settings has the same effect (Art. 17). Data held by the third parties in section 4 must be deleted with them directly.
- You also have the rights to restriction (Art. 18) and objection (Art. 21), and the right to **lodge a complaint with a data protection supervisory authority** (Art. 77), for example the authority of your country of residence.

For questions, contact us at quranmuallem@gmail.com. Because we hold no data about you, we usually cannot identify or retrieve your data. We can always explain how to manage it on your device.

## 8. Children

The app is suitable for learners of all ages and collects no data on our side. The app needs no login or account. 

## 9. Changes

We will update this policy when the app's functions change. The current version is always available in the app (Settings → Legal) and via the link on the app's store page.

*If the English and Arabic versions differ, the English version prevails.*
