/**
 * The app's brand mark: a simple, bold "W" (Warung) letterform. Deliberately
 * plain — no illustration — so it can never read as a cartoon character or
 * clash with the app's otherwise minimal, line-icon-driven UI. Rendered as
 * SVG (not plain text) so it stays crisp and centers consistently
 * regardless of whether the web font has finished loading yet.
 */
export function BrandMark({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="60"
        letterSpacing="-2"
        fill="#ffffff"
      >
        W
      </text>
    </svg>
  );
}
