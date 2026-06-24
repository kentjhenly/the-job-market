// Shared check / cross glyphs. One crisp SVG shape used everywhere a tick or an
// X appears — accept/decline buttons, panel close buttons, remove-chip X's,
// status ticks — so they look identical site-wide. Color is inherited via
// `currentColor`; size scales both glyphs from their natural aspect ratio.

interface GlyphProps {
  /** Width in px. Check keeps a 12:10 ratio; cross is square. Defaults match the reference buttons. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CheckIcon({ size = 12, strokeWidth = 2, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={(size * 10) / 12}
      viewBox="0 0 12 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <polyline points="1,5 4.5,9 11,1" />
    </svg>
  );
}

export function CrossIcon({ size = 10, strokeWidth = 2, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <line x1="1" y1="1" x2="9" y2="9" />
      <line x1="9" y1="1" x2="1" y2="9" />
    </svg>
  );
}
