/**
 * The app's storefront glyph, transparent background — designed to sit
 * inside an existing badge container (see the login/setup screens and
 * sidebar logo). This is the same shape used for the PWA home-screen icon
 * (see /design/icon-master.svg), just without its own background, so both
 * places show the same "brand mark" consistently.
 */
export function BrandMark({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 288 248" width={size} height={(size * 248) / 288} className={className} aria-hidden="true">
      <g transform="translate(144 110)">
        <path
          d="M -144,-110 L 144,-110 L 144,-70
             a 36,36 0 0 0 -72,0
             a 36,36 0 0 0 -72,0
             a 36,36 0 0 0 -72,0
             a 36,36 0 0 0 -72,0
             Z"
          fill="#f2a93b"
        />
        <path
          d="M-128 -34 L128 -34 L114 118 C113 130 103 138 91 138 L-91 138 C-103 138 -113 130 -114 118 Z"
          fill="#f7f5ee"
        />
        <rect x="-32" y="46" width="64" height="92" rx="8" fill="#312e81" />
      </g>
    </svg>
  );
}
