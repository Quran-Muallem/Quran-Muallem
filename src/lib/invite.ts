/** Invite friends: native share sheet or direct links (WhatsApp, Instagram, Facebook, Telegram, X, e-mail, SMS). */
import { isNativePlatform } from "@/lib/storage";
import { APP_ID, APP_NAME } from "@/lib/assets";
import type { Language } from "@/lib/i18n";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
/** Link shared in invitations (set VITE_INVITE_URL, e.g. your Play Store / website link). */
export const INVITE_URL = env["VITE_INVITE_URL"] || `https://play.google.com/store/apps/details?id=${APP_ID}`;

export function inviteText(language: Language): string {
  return language === "ar"
    ? `أدعوك لتطبيق «${APP_NAME}» لحفظ القرآن الكريم وتسميعه — مصحف المدينة، عشرة قرّاء، ومعلّم ذكي. مجاني تمامًا:`
    : `Join me on “${APP_NAME}” to memorize the Quran — Madani Mushaf, 10 reciters and an AI teacher. Completely free:`;
}

export type InviteChannel = "whatsapp" | "instagram" | "facebook" | "telegram" | "x" | "email" | "sms";

export function channelUrl(channel: Exclude<InviteChannel, "instagram">, text: string, url = INVITE_URL): string {
  const t = encodeURIComponent(text), u = encodeURIComponent(url), both = encodeURIComponent(`${text} ${url}`);
  switch (channel) {
    case "whatsapp": return `https://wa.me/?text=${both}`;
    case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case "telegram": return `https://t.me/share/url?url=${u}&text=${t}`;
    case "x": return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case "email": return `mailto:?subject=${encodeURIComponent(APP_NAME)}&body=${both}`;
    case "sms": return `sms:?body=${both}`;
  }
}

/** Opens a link outside the app (in the app: WhatsApp / browser; on the web: new tab). */
export function openExternal(url: string) {
  if (isNativePlatform() || url.startsWith("mailto:") || url.startsWith("sms:")) window.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
}

/** System share sheet (lists WhatsApp, Instagram, Facebook … that are installed). Returns false if unavailable. */
export async function shareNative(text: string, url = INVITE_URL, title = APP_NAME): Promise<boolean> {
  try {
    if (isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, ...(url ? { url } : {}), dialogTitle: title });
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title, text, ...(url ? { url } : {}) }); return true; }
  } catch (e) {
    // user closed the sheet: still "handled"
    if ((e as Error)?.name === "AbortError" || /cancel/i.test(String((e as Error)?.message))) return true;
  }
  return false;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}
