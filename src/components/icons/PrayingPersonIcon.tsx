/**
 * v49 «المرافق» icon — our own design: a mihrab arch crowned by a clear crescent; inside, a worshipper in
 * sujūd on the prayer line. Monochrome (currentColor) for the gold nav button; no face, no details.
 */
import { useId } from "react";

export function PrayingPersonIcon({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <mask id={`cr-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="#fff" />
          <circle cx="13.25" cy="2.35" r="1.85" fill="#000" />
        </mask>
      </defs>
      {/* crescent above the arch */}
      <circle cx="12" cy="3" r="2.35" fill="currentColor" stroke="none" mask={`url(#cr-${id})`} />
      {/* mihrab arch */}
      <path d="M4.3 21.2 V12.6 Q4.3 8.2 12 5.9 Q19.7 8.2 19.7 12.6 V21.2" strokeWidth="1.55" />
      {/* prayer line */}
      <path d="M2.6 21.2 H21.4" strokeWidth="1.55" />
      {/* worshipper in sujūd: head on the ground, back rising to the hips, knees and feet on the ground */}
      <circle cx="16.4" cy="18.75" r="1.45" fill="currentColor" stroke="none" />
      <path d="M8.3 14.4 Q11.6 14.6 14.9 17.9" strokeWidth="2.5" />
      <path d="M8.3 14.5 L9.4 19.6 L6.3 19.7" strokeWidth="2.1" />
      <path d="M14.4 18.3 L13.1 19.8" strokeWidth="1.2" />
    </svg>
  );
}

export default PrayingPersonIcon;
