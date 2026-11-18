/**
 * v57: one small app-wide toast («اضغط رجوع مرة أخرى للخروج», «مُضاف للرئيسية ✓»). Any code can call
 * `showToast`; `<AppToast />` (mounted once in the app shell) shows the latest message.
 */
export const TOAST_EVENT = "qm:toast";

export function showToast(message: string, ms = 2000) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, ms } }));
}
