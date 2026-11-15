/**
 * v54.1: no more black screens. A render error inside one tab used to unmount the whole app (React removes the
 * root on an uncaught error), leaving only the dark body. Now the error is caught per tab: header and tab bar
 * stay, the tab shows a calm card with «Try again» / «Home» and the error text (so it can be reported), and
 * the error is kept in localStorage (`qm.lastCrash`) for diagnosis.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

export type CrashCopy = { title: string; body: string; retry: string; home: string };

type Props = { children: ReactNode; area: string; copy: CrashCopy; onHome?: () => void; full?: boolean };
type State = { error: Error | null };

export function rememberCrash(area: string, error: unknown, stack?: string) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    localStorage.setItem("qm.lastCrash", JSON.stringify({ at: new Date().toISOString(), area, message: e.message, stack: (stack ?? e.stack ?? "").slice(0, 1500), ua: navigator.userAgent }));
  } catch { /* ignore */ }
}

export class CrashBoundary extends Component<Props, State> {
  override state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    rememberCrash(this.props.area, error, `${error.stack ?? ""}\n--component--${info.componentStack ?? ""}`);
    console.error(`[crash:${this.props.area}]`, error, info.componentStack);
  }
  private retry = () => this.setState({ error: null });
  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { copy, onHome, full, area } = this.props;
    return (
      <div role="alert" data-crash={area}
        className={full ? "flex min-h-[100dvh] items-center justify-center bg-[#071f18] p-5" : "px-1 py-8"}>
        <div className="sx-card mx-auto max-w-md space-y-3 rounded-3xl p-5 text-center text-[var(--sx-ink)]" style={full ? { color: "#f5ecd6", background: "#0f3a2d" } : undefined}>
          <p className="text-4xl" aria-hidden="true">🕌</p>
          <h2 className="text-xl font-extrabold">{copy.title}</h2>
          <p className="text-[0.95rem] opacity-80">{copy.body}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button type="button" onClick={this.retry} className="min-h-[48px] rounded-2xl px-5 font-bold text-[#1b1406]" style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }} data-crash-retry="">{copy.retry}</button>
            <button type="button" onClick={() => { this.setState({ error: null }); if (onHome) onHome(); else window.location.reload(); }} className="sx-chip min-h-[48px] rounded-2xl px-5 font-bold" data-crash-home="">{copy.home}</button>
          </div>
          <details className="pt-2 text-start text-xs opacity-70">
            <summary className="cursor-pointer">Details</summary>
            <pre dir="ltr" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words" data-crash-message="">{area}: {error.message}{"\n"}{(error.stack ?? "").split("\n").slice(0, 6).join("\n")}</pre>
          </details>
        </div>
      </div>
    );
  }
}
