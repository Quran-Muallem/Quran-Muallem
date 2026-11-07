import { useState, type ReactNode } from "react";
import { Check, Copy, Mail, MessageSquare, Send, Share2 } from "lucide-react";
import { AppLogo, GoldDialog, GOLD_GRADIENT } from "@/components/ornaments";
import { INVITE_URL, channelUrl, copyText, inviteText, openExternal, shareNative, type InviteChannel } from "@/lib/invite";
import { APP_NAME } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";

/** Invite friends via WhatsApp, Instagram, Facebook, Telegram, X, e-mail, SMS or the system share sheet. */
export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  const text = inviteText(language);
  const flash = (msg: string) => { setNote(msg); setTimeout(() => setNote(null), 2500); };

  const viaInstagram = async () => {
    // Instagram has no share link: the system sheet offers it in the app; otherwise copy + open Instagram.
    if (await shareNative(text)) return;
    await copyText(`${text} ${INVITE_URL}`);
    flash(t("inviteCopiedInstagram"));
    openExternal("https://www.instagram.com/direct/inbox/");
  };

  const channels: { id: InviteChannel; label: string; bg: string; icon: ReactNode; onClick: () => void }[] = [
    { id: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <WhatsAppMark />, onClick: () => openExternal(channelUrl("whatsapp", text)) },
    { id: "instagram", label: "Instagram", bg: "linear-gradient(45deg,#F58529,#DD2A7B 50%,#8134AF 75%,#515BD4)", icon: <InstagramMark />, onClick: () => void viaInstagram() },
    { id: "facebook", label: "Facebook", bg: "#1877F2", icon: <span className="text-2xl font-bold leading-none">f</span>, onClick: () => openExternal(channelUrl("facebook", text)) },
    { id: "telegram", label: "Telegram", bg: "#229ED9", icon: <Send className="h-5 w-5 -translate-x-px" />, onClick: () => openExternal(channelUrl("telegram", text)) },
    { id: "x", label: "X", bg: "#000", icon: <span className="text-lg font-bold leading-none">𝕏</span>, onClick: () => openExternal(channelUrl("x", text)) },
    { id: "email", label: t("inviteEmail"), bg: "#6B7280", icon: <Mail className="h-5 w-5" />, onClick: () => openExternal(channelUrl("email", text)) },
    { id: "sms", label: "SMS", bg: "#16A34A", icon: <MessageSquare className="h-5 w-5" />, onClick: () => openExternal(channelUrl("sms", text)) },
  ];

  return (
    <GoldDialog open={open} onOpenChange={onOpenChange} title={t("inviteTitle")} description={t("inviteSub")}>
      <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-3">
        <AppLogo className="h-12 w-12 shrink-0" />
        <p className="text-sm leading-relaxed text-emerald-50/90" dir="auto">{text} <span dir="ltr" className="break-all text-amber-200">{INVITE_URL}</span></p>
      </div>

      <button type="button" onClick={async () => { if (!(await shareNative(text))) { await copyText(`${text} ${INVITE_URL}`); flash(t("inviteCopied")); } }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
        <Share2 className="h-4 w-4" />{t("inviteShare")}
      </button>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {channels.map((c) => (
          <button key={c.id} type="button" onClick={c.onClick} className="flex flex-col items-center gap-1.5 text-[0.7rem] text-emerald-50/85">
            <span className="flex h-12 w-12 items-center justify-center rounded-full text-[#fff] shadow-md" style={{ background: c.bg }}>{c.icon}</span>
            {c.label}
          </button>
        ))}
        <button type="button" onClick={async () => { flash((await copyText(`${text} ${INVITE_URL}`)) ? t("inviteCopied") : t("backupFailed")); }}
          className="flex flex-col items-center gap-1.5 text-[0.7rem] text-emerald-50/85">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-amber-100 shadow-md">{note ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</span>
          {t("inviteCopy")}
        </button>
      </div>
      {note && <p role="status" className="mt-3 text-center text-sm text-amber-100 animate-in fade-in">{note}</p>}
      <p className="mt-4 text-center text-xs text-emerald-100/55">{APP_NAME} · {t("inviteFree")}</p>
    </GoldDialog>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z" />
      <path d="M9.2 8.6c.2-.4.5-.5.8-.4l.6.1.8 1.8-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 1.8.8.1.6c0 .4-.2.7-.5.9-.7.4-1.6.4-2.8-.2a8 8 0 0 1-3.5-3.5c-.6-1.2-.6-2-.2-2.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default InviteDialog;
