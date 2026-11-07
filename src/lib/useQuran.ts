import { useCallback, useEffect, useState } from "react";
import { SURAH_META, getSurahAyahs, getSurahList, QuranOfflineError, type SurahMeta, type SurahText } from "@/lib/quranService";

/** All 114 surahs. Starts with built-in metadata, then switches to the (cached) API list. */
export function useSurahList(): SurahMeta[] {
  const [list, setList] = useState<SurahMeta[]>(SURAH_META);
  useEffect(() => {
    let alive = true;
    void getSurahList().then((l) => { if (alive) setList(l); });
    return () => { alive = false; };
  }, []);
  return list;
}

export type SurahState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: SurahText; error: null }
  | { status: "error"; data: null; error: "offline" | "failed" };

/** Uthmani text of one surah (cache → network). */
export function useSurahText(surahId: number): SurahState & { retry: () => void } {
  const [state, setState] = useState<SurahState>({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    getSurahAyahs(surahId, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ status: "ready", data, error: null }); })
      .catch((e) => { if (!controller.signal.aborted) setState({ status: "error", data: null, error: e instanceof QuranOfflineError ? "offline" : "failed" }); });
    return () => controller.abort();
  }, [surahId, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}
