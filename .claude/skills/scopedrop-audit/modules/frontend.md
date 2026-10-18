# Module: frontend

Goal: show what the user actually sees. That means the route coverage, the data wiring, the UI states, the responsiveness, and the accessibility.

## Checks

1. **Route inventory.** Locate the router (React Router or equivalent) and list every route in a table with these columns:

   | Path | Component | Content pillar | Data source (table/function) | Status (LIVE / STUB / DEAD) |

   - Map each route to one of the six pillars: News, Funding, Companies, Learn, Events, or Get Your Scope.
   - A pillar with no route is a P1 finding.
   - A route to a component that renders placeholder or mock content is STUB.
   - A route that should be removed (such as Submit Event) is DEAD.
2. **Data wiring.**
   - Grep `src` for `supabase.from(`, `.rpc(`, `functions.invoke(`, and `.channel(` (Realtime).
   - Build the component → table map.
   - Cross-check it against the write side recorded by `backend-pipeline`:
     - A table that is read but has no writer means the UI is waiting on data that never arrives. This is P1.
     - A table that is written but has no reader is reported by backend-pipeline.
   - Find any remaining mock data:
     - Run `grep -rIni "mock\|dummy\|lorem\|placeholder\|sampleData\|fakeData" src`.
     - Look for hardcoded arrays of objects in components.
3. **UI states.**
   - For every data-fetching component, check that it handles loading, empty, and error states. Report a matrix with these columns: Component | Loading | Empty | Error.
   - A component that silently renders nothing on error is a P2 finding.
   - Check whether data fetching uses a shared hook or query layer (TanStack Query, SWR, or a custom hook), or whether it is ad-hoc `useEffect` code.
4. **Type safety.**
   - Check whether Supabase types are generated (`supabase gen types` output, e.g. `src/integrations/supabase/types.ts`).
   - Check whether queries are typed against those generated types.
   - Count the uses of `any`, `as any`, and `@ts-ignore` / `@ts-expect-error` in `src`.
5. **Component structure.**
   - Flag components over 300 lines as P2 split candidates.
   - Find duplicated card or list components that should be shared primitives.
   - Check whether the "autofit primitives" from Phase 1 exist and are reused.
6. **Responsive design.**
   - Check whether Tailwind breakpoints (`sm:`, `md:`, `lg:`) or media queries are present on layout components.
   - Find fixed pixel widths on containers.
   - Check for horizontal-overflow risks on carousels and tables.
7. **Accessibility (static checks).**
   - `<img>` without `alt`.
   - Icon-only buttons without `aria-label`.
   - Click handlers on non-interactive elements (`div` or `span` with `onClick` and no `role` or `tabIndex`).
   - A missing `lang` attribute on `index.html`.
   - Heading-order problems on the main pages.
   - Contrast must be computed for these pairs, and each pair below 4.5:1 for body text is a P2 finding:
     - Amber `#E8A33D` on Ink `#0A1628`
     - Amber `#E8A33D` on Oxford `#0F2847`
     - Parrot `#3ECF6E` on Ink `#0A1628`
     - Parrot `#3ECF6E` on Oxford `#0F2847`
     - The main body-text color on Ink `#0A1628`
     - The main body-text color on Oxford `#0F2847`
8. **Realtime.**
   - Check whether the signal rail subscribes to Supabase Realtime.
   - Check whether every subscription is cleaned up on unmount (`removeChannel` or `unsubscribe` in the effect cleanup). A leaked subscription is a P1 finding.
