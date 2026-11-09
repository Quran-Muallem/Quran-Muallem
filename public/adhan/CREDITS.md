# Adhan recordings

| File | Voice | Source | Licence |
|---|---|---|---|
| `madinah.mp3` | Madinah – Sheikh Muhammad Marwan Qassas (Masjid an-Nabawi) | supplied by the app owner | **rights to be confirmed by the app owner before publishing** |
| `madinah_fajr.mp3` | Madinah Fajr Adhan – Sheikh Muhammad Marwan Qassas | supplied by the app owner | **rights to be confirmed by the app owner before publishing** |
| `alafasy_fajr.mp3` | Fajr Adhan – Sheikh Mishary Rashid Alafasy (Maqam Hijaz) | supplied by the app owner | **rights to be confirmed by the app owner before publishing** |
| `madinah_cc.mp3` | Call to prayer from the Prophet's Mosque | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg), ejaz215 via freesound.org | CC BY 3.0 |
| `silence.mp3` | 1 s silence ("vibration only") | generated | — |

Converted with `node scripts/adhan-sounds.mjs <id> <original>` (mono, −16 LUFS, silence trimmed; `ios/*.caf` = first 29 s).

Prepared slots without a recording yet (src/data/adhanVoices.ts): Makkah (Masjid al-Haram), Al-Aqsa, Abdul Basit, short/calm Adhan.
Freely licensed candidates on Wikimedia Commons: "Adhan, Great Mosque of Mecca - Jan 21, 2013.webm" (CC BY), "Eid al-Fitr Fajr azan at Malmö Mosque - 19 August 2012.webm" (CC BY), "Adhan wiki.oga" (CC BY-SA).
