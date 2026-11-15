# Privacy Policy

**App:** Quran Muallem - معلم القرآن (Learn Quran with the help of AI), Android, iOS and web version · **Version:** 1.23 · **Last updated:** 15 November 2026

Quran Muallem is built as a local-first app. We do not run servers for it, we do not create user accounts on any server, and we do not use analytics, advertising, crash-reporting or tracking tools. This policy explains which data the app handles, where it is stored, which device functions it uses and which third parties the app contacts on your behalf. It complies with the EU General Data Protection Regulation (GDPR).

## 1. Controller

Oualid Ben Rejeb
E-mail: quranmuallem@gmail.com

The app's server-free design means we (the controller) never receive your personal data. Section 6 lists the third parties that do receive technical data when you use certain functions.

## 2. Data stored only on your device

All data the app creates is stored **only on your device**, inside the app's private storage (Capacitor Preferences, Local Storage, IndexedDB and app files in the Android/iOS app; Local Storage, IndexedDB and Cache Storage in the web version). None of it is sent to servers operated by us or to anyone else. This includes:

| Data | Purpose |
|---|---|
| Your name (optional, as you typed it on the first start) | Greet you in the app |
| Memorization progress, streak, review dates, practice results (accuracy per verse), word colours (correct / almost / mistake) per verse, surah badges, khatma progress | Progress tracking, smart review and badges |
| Settings (language, theme, fonts and text size, reciter, speech engine, correction options, Kids Mode) | Your preferences |
| Your own recitation recordings (one per surah, with accuracy and mode; switch saving off in Settings → Privacy → Data use, delete them in Settings → Privacy → Delete all recordings) | Listen back to your recitation |
| Your voice profile: words you added after a misrecognition, your recognition strictness, average recitation speed and accuracy per surah | Adapt the recognition to your voice |
| Hands-free Hifdh and Salat Companion: your settings, the list of your hands-free sessions (date, surah and verses, duration) | Show your sessions and continue where you stopped |
| Prayer-time settings: your location (GPS coordinates or the city and country you entered), calculation method, madhab, minute offsets, Adhan voice and notification mode per prayer; daily reminder time | Calculate prayer times, schedule Adhan notifications and your reminder |
| Last known position for the Qibla compass | Compass works offline |
| Favourites and reading position: bookmarks, recently read pages, favourite duas, reciters and Tajweed examples, adhkar counters | Find things again quickly |
| Kids Mode: stars per surah, Star Journey progress, the last opened surah, story progress | Show the child's progress |
| Quran Stories: chapters you read, narration settings | Continue the story |
| A technical error note after a crash (time, screen, error message, device/browser type) | Show you the error so you can report it yourself if you wish – it is never sent automatically |
| Cached Quran text, downloaded recitation audio, translations, tafsir and hadith you opened or downloaded, speech-recognition model files | Offline use |

## 3. Microphone and speech recognition

**What is recorded and when.** The app uses your microphone **only while you have switched it on**: while a recitation is running (Mushaf, Tasmīʿ, Kids Mushaf), or while you have started Hands-free Hifdh or the Salat Companion. In those two modes listening continues with the screen off, until you stop it. On Android this runs as a foreground service, so a **permanent notification** shows that the microphone is in use. You can stop it there, in the app, or with your headset's buttons.

**Recognition on your device.** Your recitation is recognised **entirely on your device** and compared with the Quran text:
- **Quran phoneme engine (default):** the phoneme recognition model of Quran-Lab (Zipformer, trained on Hafs recitation), bundled with the app. Nothing is downloaded or uploaded for it.
- **Whisper (fallback):** used only if the phoneme engine cannot run on a device. If its model files are not bundled, they are downloaded once (about 40–120 MB) from Hugging Face (huggingface.co) and cached on your device. No audio is sent with that request; your IP address is visible to Hugging Face.

**Audio never leaves your device.** Recordings are never uploaded, never shared and never used to train AI models. We do not use any cloud speech or AI service. Recognition results (which words were recited correctly) are saved as part of your progress.

**Automatic recognition of the surah.** When you start reciting, the app compares your first words with the whole Quran on your device to find the surah and verse you are reciting. This happens offline.

**Headsets.** Bluetooth or wired headsets and their media buttons are used through your device's normal audio routing; the app does not scan for, pair or identify Bluetooth devices.

## 4. Other device functions

- **Location:** used for prayer times and the Qibla compass. Prayer times and the Qibla direction are **calculated on your device**; your coordinates are never sent anywhere and never used for tracking.
- **Motion sensors (accelerometer, compass):** the Qibla compass uses the magnetometer. The Salat Companion can use the accelerometer, while you pray with the phone in your pocket, to follow standing, rukūʿ, sujūd and sitting and to count your rakʿāt. Sensor readings are evaluated **only in the moment, on your device**; they are not stored and not sent anywhere.
- **Notifications and exact alarms:** Adhan notifications and the daily reminder are scheduled **locally** by your device's operating system (Android: exact alarms, a notification channel per Adhan recording, re-planned after a restart; iOS: local notifications). There is no push server. The Adhan recordings are bundled with the app.
- **Text-to-speech:** Quran Stories and the Kids tafsir can be read aloud with your **device's own text-to-speech engine**. The text of the story is passed to that system service, which processes it under the terms of its provider (e.g. Google or Apple); depending on your device settings this may be done online. The Quran itself is never read by a synthetic voice – only by the recorded Sheikhs.
- **Background playback, screen-on and vibration:** a foreground service keeps a recitation playing with the screen off (with lock-screen controls); while you read or recite, the screen is kept on; vibration is used for feedback. None of this produces data.

All access to the microphone, location, notifications, alarms and motion sensors is requested through the operating system's permission dialog. You can revoke it at any time in your device settings (Art. 6(1)(a) GDPR); the related function then stops working, the rest of the app keeps working.

## 5. Kids Mode

Kids Mode is a simplified area for children (Kids Mushaf, Star Journey, stories, kids tafsir). It works under the same rules as the rest of the app: **no account, no chat, no advertising, no in-app purchases, no analytics and no data collection by us.** Stars and progress stay on the device. A child's recitation is recognised on the device and never uploaded. Content such as recitation audio and translations is loaded from the services in section 6 without any identifier of the child. Parents can delete everything with Settings → Privacy → "Delete all my data".

## 6. Third-party services the app contacts

The app connects directly from your device to the following services only when you use the related function. Each one can see your IP address and the technical data of the request (e.g. device type), and processes it under its own privacy policy. Only the content you asked for is requested (e.g. a surah, verse, reciter or book); no personal data of yours is sent. Where these providers are located outside the EU (mostly in the USA), data is transferred to a third country. Legal basis: Art. 6(1)(b) GDPR (providing the function you requested) and Art. 6(1)(f) GDPR (our legitimate interest in providing a working app).

### 6.1 Quran text, Tajweed and recitation audio
- **Quran.com** (api.quran.com, api.qurancdn.com, verses.quran.com, audio.qurancdn.com, download.quranicaudio.com): Quran text and surah data (rarely needed – the Madani Mushaf and Uthmani text are bundled), the coloured Tajweed text, word-by-word audio and verse timings used in corrections («Listen to the word»), the teaching recitations of the Tajweed guide and recitation audio.
- **AlQuran Cloud** (api.alquran.cloud): fallback for Quran text, translations and surah data.
- **EveryAyah** (everyayah.com, mirrors.quranicaudio.com): verse-by-verse recitation audio, streamed or downloaded when you press play or download.
- **mp3quran.net** (www.mp3quran.net, cdn.mp3quran.net, server*.mp3quran.net): the reciters library (whole surahs and riwāyāt) and the connection test, which downloads a short sample file.

### 6.2 Translations, tafsir and hadith
- **Quran.com**, **AlQuran Cloud** and **QuranEnc** (quranenc.com): translations of the meanings of the Quran (also shown under the verses in the Kids Mushaf) and tafsir, loaded when you open them.
- **jsDelivr** (cdn.jsdelivr.net) and, as a fallback, **GitHub** (raw.githubusercontent.com): the open data sets for tafsir (spa5k/tafsir_api) and the hadith collections (fawazahmed0/hadith-api).

What you have loaded is kept on your device. Ḥiṣn al-Muslim, the adhkar, the Quran stories and the kids tafsir are bundled with the app and work offline.

### 6.3 Prayer times
- **With your GPS position**, prayer times are **calculated on your device** (offline). Your coordinates are not sent anywhere.
- **If you enter a city instead**, the city and country name, the date and the calculation method are sent to **Aladhan** (api.aladhan.com) to get that day's times. The result is cached on your device.

### 6.4 Speech model
- **Hugging Face** (huggingface.co): only for the Whisper fallback, see section 3.

### 6.5 Web version
The web version is hosted on **GitHub Pages** (GitHub, Inc., USA). When you open it, GitHub receives your IP address and the technical data of the request and may keep them in server logs for security purposes. We have no access to these logs.

### 6.6 Sharing and invitations
If you invite friends or share something, the app opens your device's share sheet or the app/website you choose (WhatsApp, Instagram, Facebook, Telegram, X, e-mail, SMS). Only the text you send is passed on.

## 7. No tracking, no ads, no profiling

The app contains no advertising, no analytics or crash-reporting SDKs, no advertising ID, no tracking cookies and no profiling. We do not sell or share data.

## 8. Your rights and control

Because your data is on your device, you control it directly:
- **Access and export:** Settings → Privacy → Data use → Progress backup → Export creates a JSON file of your progress, which you can import on another device (Art. 15 and 20 GDPR).
- **Correction:** change your name and settings in the app (Art. 16).
- **Deletion:** Settings → Privacy → "Delete all my data" removes your name, progress, settings, recordings, voice profile, prayer and location settings, Kids Mode stars, stories progress, favourites, error notes and cached or downloaded files from the device. Recordings alone can be deleted with Settings → Privacy → "Delete all recordings". Uninstalling the app or clearing its data in the system settings has the same effect (Art. 17). Data held by the third parties in section 6 (such as server logs) must be requested from them directly.
- You also have the rights to restriction (Art. 18) and objection (Art. 21), and the right to **lodge a complaint with a data protection supervisory authority** (Art. 77), for example the authority of your country of residence.

For questions, contact us at quranmuallem@gmail.com. Because we hold no data about you, we usually cannot identify or retrieve your data. We can always explain how to manage it on your device.

## 9. Children

The app is suitable for learners of all ages, including children in Kids Mode (section 5). We do not knowingly collect personal data from anyone, including children under 13 (or the age set by your country's law): the app has no login or account, and the optional name, progress and recordings stay on the device. We recommend that parents set up the app for young children and keep an eye on its use.

## 10. Security

Your data is protected by the security of your device (app sandbox, screen lock, device encryption). Connections to the services in section 6 use encrypted HTTPS. Please keep your device protected with a screen lock.

## 11. Changes

We will update this policy when the app's functions change; the date above shows the latest version. The current version is always available in the app (Settings → Privacy → Data use → Legal) and at https://quran-muallem.github.io/Quran-Muallem/legal/privacy.html.

*If the English and Arabic versions differ, the English version prevails.*
