# Bundled recognition models

| File | What | Licence |
|---|---|---|
| `zipformer_p_arabic_v3.1.int8.onnx` | Quran-Lab streaming phoneme Zipformer (CTC, int8), Hafs ʿan ʿĀṣim | NPL-1.2 |
| `tokens.txt` | its 251 phoneme symbols (blank = 250) | NPL-1.2 |
| `quran_phonemes.json` | Hafs phonemes per Mushaf word, built by `scripts/build-phonemes.mjs` from Quran-Lab's `ordered_quran_phonemes.json` (`models-src/`) | NPL-1.2 (derivative) |
| `LICENSE-NPL-1.2.txt` | the licence — must stay with these files | — |

NPL-1.2 in short: free use only. Never charge for the model, access to it, or any feature it powers
(no payment, subscription, paywall or advertising). The app must say that automatic tajweed feedback can
be wrong and does not replace a qualified teacher. Source: https://huggingface.co/Quran-Lab/zipformer_p-arabic-v3

Whisper models (optional, `npm run models:whisper`) go into sub-folders here and are not committed.
