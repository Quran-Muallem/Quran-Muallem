<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep interface translations in a shared language context and dictionary, with document language/direction synchronized to the selected language; this keeps layout and copy consistent without resetting practice state.
- Languages: `src/i18n/index.ts` (list, RTL, weekday letters, lazy loaders). Arabic/English reference texts live in `copy` (`src/lib/i18n.tsx`); every other language is `src/i18n/locales/<code>.json` with exactly the same keys and placeholders (checked by `src/test/languages.test.ts`). A new key must be added to all 11 JSON files. Legal texts in another language: `legal/<doc>.<code>.md`, then `npm run legal` (missing → English).
- Badges (`src/lib/badges.ts`): silver = every word of a surah completed in READING, gold = in MEMORIZATION; awarded only from `completeSurah` when the surah's last word is completed. Never add timer- or accuracy-based grants. Both views report words through `RecitationContext` (`recordWords`, `finishSurah`).
- PWA: `public/sw.js` + `public/manifest.webmanifest`; the static build (`vite.capacitor.config.ts`) writes `precache.json`. Bump nothing by hand: the build stamps `sw.js` with the file-list hash.
- Recitation state that must survive tab switches (Mushaf view, Recite transcript, running session totals) lives in `src/context/RecitationContext.tsx`. Surah completion (stop mic, success haptic, chime): `src/lib/surahCompletion.ts`, `src/lib/chime.ts`.
- There is no AI chat. The Tajweed tab is an offline guide (`src/data/tajweedData.ts`); Tafsir and Fatwas are referred to qualified scholars.

- The app is serverless and local-first: no backend, no database. Persist with `src/lib/storage.ts` (kv / idb) only.
- 100 % offline AI: speech recognition runs only on the device. Default engine: Quran-Lab's streaming phoneme Zipformer (`public/models/`, NPL-1.2 — never charge for it or any feature it powers, keep `LICENSE-NPL-1.2.txt`, keep the "feedback can be wrong, not a teacher" notice). Pipeline: `audioPipeline.ts` (VAD + Kaldi fbank) → `zipformerEngine.ts` / `zipformer.worker.ts` / `zipformerCore.ts` (onnxruntime-web 1.14, WASM) → `quranAlignment.ts` (phoneme alignment, word states) → `userAdaptation.ts` (voice profile, IndexedDB `quran_user_voice_profile`). Fallback: Whisper (`whisper.ts` + `whisper.worker.ts`, @xenova/transformers) → `quranMatcher.ts`. Never send audio or text to a server, never add Groq/OpenAI/other cloud AI or API keys, never use the browser's Web Speech recognizer. `src/test/recitationAudio.test.ts` guards this. `quran_phonemes.json` is generated: `node scripts/build-phonemes.mjs`.
- The Capacitor app is built with `vite.capacitor.config.ts` (entry `src/app-main.tsx`); keep `<App />` in `src/routes/index.tsx` free of server-only code.
