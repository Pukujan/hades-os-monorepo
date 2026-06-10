# GitHub Issue Draft: UI Contrast + Icon Polish

## Title
Improve contrast for light themes and finalize icon treatment

## Body
The recent UI updates are working, but two follow-up items should be addressed before we treat the app as visually stable:

1. Light-theme contrast
   - `Petal Mist`, `Coastline`, and `Slate Pro` still need a final readability pass on mobile.
   - Some secondary labels, card captions, and muted text can still feel too soft against the light panels.
   - Keep the prototype layout and visual direction intact. Only tighten contrast and surface separation.

2. Icon system polish
   - The app now uses a vector icon pack, which is better than emoji, but a few placements may still need size/weight tuning.
   - Verify nav icons, card avatars, theme chips, and locked preview icons all feel balanced at mobile scale.

## Suggested acceptance criteria
- Light-theme text remains readable across the main screens on a mobile viewport.
- Nav and card icons look consistent in size and weight.
- The prototype layout, card hierarchy, and bottom navigation stay unchanged.

## Context
- The app is still following the Hades MVP prototype as the source of truth.
- The next major milestone after this is moving toward real hosting and integration with Hermes, the private AI server, Railway, Supabase, and Vercel.
