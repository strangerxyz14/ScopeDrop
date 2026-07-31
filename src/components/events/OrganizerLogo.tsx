import { cn } from "@/lib/utils";

interface OrganizerLogoProps {
  /** Logo URL — from scheduled_events.organizer_logo_url or logo_cache. */
  logoUrl?: string | null;
  /** Organizer name — used for alt text AND the monogram fallback. */
  organizerName: string;
  /** Rendered size in px. Applied to both width and height. Default 48. */
  size?: number;
  /** Optional wrapper class overrides. */
  className?: string;
}

/**
 * Square logo tile with monogram fallback. Handles three cases:
 *  - logoUrl present + loads: renders the image
 *  - logoUrl absent: renders the first letter of organizerName in parrot green
 *  - logoUrl present but 404s: onError hides the img and the monogram takes over
 *
 * The white/5 background is a neutral surface that works under both the
 * ScopeDrop dark theme and the Logo.dev CDN's mixed-luminance logos
 * (some are transparent PNGs designed for light backgrounds).
 */
export function OrganizerLogo({
  logoUrl,
  organizerName,
  size = 48,
  className,
}: OrganizerLogoProps) {
  const monogram = organizerName?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-md bg-white/5 p-1.5 shrink-0 overflow-hidden",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={organizerName ? `${organizerName} logo` : "Organizer logo"}
    >
      {/* Monogram sits underneath as a base layer. When the img renders
          successfully it covers this; when the img errors and hides itself
          the monogram is already there — no extra state juggle needed. */}
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold text-[#3ECF6E] select-none pointer-events-none"
        style={{ fontSize: size * 0.5 }}
        aria-hidden="true"
      >
        {monogram}
      </span>
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className="relative max-h-full max-w-full object-contain"
        />
      )}
    </div>
  );
}
