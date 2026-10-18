# Module: design-system

Goal: verify compliance with the locked design system in baseline.md. Report each violation as P2 with `path:line`, unless noted otherwise.

## Checks

1. **Token source.** Find where colors and fonts are defined: `tailwind.config.*`, CSS variables in `index.css`, or a theme file. Check that tokens exist for the following, then grep `src` for raw hex (`#[0-9a-fA-F]{3,8}`), `rgb(`, and Tailwind arbitrary colors (`\[#`). Every raw color outside the token file is a violation.

   | Token | Value |
   |---|---|
   | Ink | `#0A1628` |
   | Oxford | `#0F2847` |
   | Amber | `#E8A33D` |
   | Parrot | `#3ECF6E` |
2. **Amber exclusivity.** List every usage of the amber token or hex. Each one must render a monetary value (funding amount, valuation, round size). Amber on non-monetary UI is a violation.
3. **Parrot exclusivity.** List every usage of the parrot token or hex. Each one must be a live or status signal. Decorative use, such as buttons, borders, or headings without status meaning, is a violation.
4. **Typography.**
   - Check that the fonts are loaded and declared: Inter 400–800, Space Grotesk, and IBM Plex Mono.
   - Headings (`h1`–`h3` and display text) should use Space Grotesk.
   - Data fields (numbers, dates, amounts, tickers) should use IBM Plex Mono.
   - UI text should use Inter.
   - Sample the main page components and report mismatches.
   - Flag any other font family, such as a leftover template default.
5. **Motion policy.**
   - Run `grep -rIni "marquee\|ticker\|autoplay\|autoPlay\|setInterval\|keyframes\|animate-" src`.
   - Allowed motion:
     - Realtime insert animation on the signal rail
     - Scroll reveals
     - The Term of Day cross-fade
   - Auto-rotating carousels count as a violation, so check `EventsCarousel` and any Embla or Swiper config with `autoplay`.
   - Tickers and marquees are also violations.
6. **Funding card amber bar.**
   - Check that the left-edge vertical bar exists.
   - Check that its height is computed relative to the largest round currently in view, not a fixed scale and not the global maximum.
7. **Brand.**
   - The wordmark text must be exactly "ScopeDrop". Grep for variants such as "Scope Drop", "Scopedrop", and "SCOPEDROP" in UI strings.
   - The favicon must be the parrot ring only.
   - The `<title>` must include the tagline "The pulse of what's building".
   - The tagline must not appear elsewhere in the UI.
8. **Editorial elements.**
   - Desk bylines must use exactly these four names: The Decode Desk, The Pattern Desk, The Data Desk, and The Radar Desk. Grep for these names.
   - Report which pages render a byline and which do not.
   - AI-disclosure badges are required on AI-generated content (summaries, editorial text, generated images). Report each AI-generated surface that lacks a badge as a P1 finding.
9. **Images.**
   - Check that article and event images use a 16:9 container sized to the 1536×864 assets.
   - Find abstract or diagrammatic placeholder images where photorealistic ones are expected.

## Report contribution
A compliance table with these columns: Rule | Status (COMPLIANT / VIOLATIONS: n) | Worst examples (`path:line`).
