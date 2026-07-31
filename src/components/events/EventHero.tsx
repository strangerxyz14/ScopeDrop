import { cn } from "@/lib/utils";

// Universal fallback lives in public/ and is served as a plain static asset.
// SVG (not JPG) because it stays crisp at every render size and required
// zero build-time image processing to author. Absolute path — safe under
// Vite's `base: '/'`, which ScopeDrop uses.
const UNIVERSAL_FALLBACK = "/images/event-fallback-universal.svg";

interface EventHeroProps {
  /** Cover URL. If missing or later 404s, falls back to UNIVERSAL_FALLBACK. */
  imageUrl?: string | null;
  /** Alt text — usually the event title. */
  title: string;
  /** Optional wrapper class overrides. Aspect ratio + rounded corners come from the base. */
  className?: string;
}

/**
 * Reusable full-bleed hero cover for event surfaces (detail page, feature
 * strip, related-events cards when they grow images). Handles:
 *  - null/undefined imageUrl → immediately uses the fallback
 *  - broken image URL (404, hotlink block, CORS) → onError swaps to the fallback
 *  - dark gradient overlay for legible glass-pane text on top
 *
 * Not yet wired into EventsCarousel per the Phase 1 boundary — that's a
 * card-refactor concern for a later phase. Available for adoption now.
 */
export function EventHero({ imageUrl, title, className }: EventHeroProps) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-[#0F2847]",
        className,
      )}
    >
      <img
        src={imageUrl || UNIVERSAL_FALLBACK}
        alt={title}
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          // Guard against an infinite loop if the fallback itself 404s
          // (e.g. someone removes the asset).
          if (!img.src.endsWith(UNIVERSAL_FALLBACK)) {
            img.src = UNIVERSAL_FALLBACK;
          }
        }}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Bottom-heavy dark wash so text sitting on the image stays legible
          without changing the underlying photo's exposure. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1628]/80 via-[#0A1628]/20 to-transparent" />
    </div>
  );
}
