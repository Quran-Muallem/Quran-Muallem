import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/appToast";

/** v57: the app-wide toast pill above the tab bar (see `showToast`). */
export function AppToast() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; ms: number }>).detail;
      clearTimeout(timer);
      setToast({ message: d.message, id: Date.now() });
      timer = setTimeout(() => setToast(null), d.ms);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => { window.removeEventListener(TOAST_EVENT, on); clearTimeout(timer); };
  }, []);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-6" role="status" aria-live="polite">
      <span key={toast.id} data-app-toast=""
        className="max-w-sm rounded-full bg-[#10261d]/95 px-5 py-2.5 text-center text-[0.98rem] font-bold text-[#f3d27a] shadow-[0_12px_28px_-10px_rgba(0,0,0,.6)] ring-1 ring-[#d4af37]/60 animate-in fade-in slide-in-from-bottom-2 duration-200">
        {toast.message}
      </span>
    </div>
  );
}
