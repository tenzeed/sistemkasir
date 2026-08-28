import { User } from 'lucide-react';

/**
 * The app's brand mark badge content — a plain user/account icon.
 * Deliberately unfussy: earlier attempts at a custom storefront
 * illustration and a letterform monogram both missed the mark, so this
 * sticks to the same simple, universally-understood pattern seen on login
 * screens everywhere (and matches the app's existing lucide-react icon
 * language used everywhere else in the UI).
 */
export function BrandMark({ size = 28, className = '' }) {
  return <User size={size} strokeWidth={2.2} className={`text-marigold-300 ${className}`} />;
}
