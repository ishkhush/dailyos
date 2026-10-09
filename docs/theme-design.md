# Visual identities

The six additions use muted, multi-hue palettes rather than the existing monochrome accent families. They preserve app structure and urgent alerts, prayer emphasis, XP and photo colors. Each has separate fonts, material, card geometry, line-icon treatment and layered SVG motifs. Font fallbacks work offline; the service worker can retain downloaded font responses.

| Theme | Symbolism | Palette and material | Font pair (display / body) |
| --- | --- | --- | --- |
| Modern | Warm rooms and quiet daily rituals. | Opaque bone, greige, sand and espresso with clay; matte surfaces and organic corners. | Cormorant Garamond / Manrope |
| Pokémon | Friendship, adventure and growing together. | Blue sky/clouds, Poké Balls and type palettes: moonlit Umbreon, playful Gengar, psychic Mewtwo and green/gold Rayquaza. | Nunito / Nunito, with different heading weights |
| Akatsuki | Pain, loss and ambition expressed through Itachi, crows and red clouds. | Ink black, charcoal, blood-red motifs and bone; dark cloth texture. | Permanent Marker / Manrope |
| Vintage | Printer ornaments and registration marks evoke printed pages and a slower rhythm. | Warm ink, oat, sage, dusty lilac; halftone paper and offset shadows. | Libre Baskerville / IBM Plex Mono |
| Zen Garden | Open enso circles, stones and sand lines suggest balance and renewal. | Moss, rice paper, clay; raked sand with asymmetric stone forms. | Noto Serif JP / Noto Sans |
| Tidal Lagoon | Coral branches and water bubbles symbolize living growth beneath the tide. | Sea glass, coral, mist blue; watery caustics and rounded translucent surfaces. | Marcellus / DM Sans |
| Desert Loom | Dunes, a low sun and woven diamonds represent steady journeys and craft. | Terracotta, mauve, sage; crosswoven fabric with terraced shadows. | Fraunces / Source Sans 3 |
| Observatory | Astrolabe rings and star charts suggest perspective and possibility. | Lavender slate, brass, mist blue; velvet skies with fine celestial brass lines. | Cormorant Garamond / Inter |

## Research and limits

Nature imagery and coherent texture informed the garden, water and desert concepts. An original [study of nature associations and lower-level image properties](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.591403/full) considers color, brightness, spatial structure and preferences together. An original [waterfront restoration study](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1113134/full) reports restorative effects of selected natural audiovisual elements. These support nature-inspired, coherent visual concepts; they do not prove that a particular app hex palette is universally soothing. The softened saturation and warm/cool balance here are design interpretations, and users can choose their preference.

Readable contrast follows [W3C's contrast minimum guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum): 4.5:1 for ordinary text. Calculations use WCAG sRGB relative luminance. Across each theme's four opaque background tokens, every primary/secondary/tertiary text token and semantic accent exceeds 4.5:1. Accent-filled controls use the dark `--on-accent` token. Urgent styling remains its existing high-contrast red; decorative materials are low opacity and never recolor photos.

| Theme | Lowest text ratio | Lowest accent ratio | Lowest filled-button text ratio |
| --- | ---: | ---: | ---: |
| Modern | 5.26 (bone surface) | 5.12 (clay on cream) | 5.54 (bone on clay) |
| Vintage | 5.48 | 6.02 | 8.95 |
| Zen Garden | 5.31 | 5.56 | 8.33 |
| Tidal Lagoon | 5.48 | 5.76 | 8.51 |
| Desert Loom | 5.04 | 5.46 | 8.30 |
| Observatory | 5.55 | 6.47 | 9.78 |

These are token-pair checks, not a claim of a full accessibility audit of every inherited opacity, image overlay or disabled control. The existing reduced-motion rule disables ambient and preview animation and transitions; hidden documents pause ambient motifs. Mobile retains two picker columns, while desktop uses three in a wider sheet. Miniatures render actual theme tokens, fonts, materials, geometry and XP styling. Tapping switches the app immediately while leaving the picker open for comparison; Done closes it.

Selection remains `dos_theme_v1`, which is already included in the durable sync records and backups. No storage migration or new key is required.

## October 8 redesign

Modern replaces its previous identity under the same `modern` selection, so existing users adopt the replacement automatically. The warm mineral palette is an interpretation of [Axel Vervoordt's natural plaster and curved finishes](https://axel-vervoordt.s3.amazonaws.com/documents/21.Elle-Decor-UK-April-2018.pdf), [Benjamin Moore's modern interiors](https://www.benjaminmoore.com/en-us/paint-colors/modern-interior), and [SKIMS' bone/sand/clay/onyx color vocabulary](https://skims.com/products/shine-foundations-dipped-thong-oxide-lace-print). Cormorant's elegant serif headings add an interior/fashion editorial feel; Manrope supplies clear everyday labels, with restrained tracking. These are design choices rather than a claim to reproduce proprietary branding.

Akatsuki's Permanent Marker is an open-license brush display face chosen for an ink/ninja mood, paired with Manrope for legible everyday text and numbers. It is not the proprietary Naruto logo font. Pokémon uses Nunito's rounded, friendly forms and bold headings rather than an imitation logo font. All four used fonts are bundled as deduplicated Latin WOFF2 assets with licenses; they work offline without Google Fonts requests for these themes.

Character provenance, franchise research, sizes and alpha checks are recorded in [the private asset manifest](../assets/themes/PROVENANCE.md). Transparent art is reserved beside header text, with phone/desktop sources and resolution-independent SVG motifs. Hidan and Tobi use the owner-supplied art with white backgrounds removed; no character placeholders remain. Reduced motion stops cloud/crow/completion effects. The owner initially selected local preparation on October 8, then explicitly requested deployment to the existing shared desktop/iPhone app after supplying the remaining art. Bundled theme assets are included in the GitHub Pages deployment and its live-file verification.

The clipped Progress descender came from a 0.92 line-height and gradient text clipping to its undersized element box. The other headers had similarly tight line boxes. Shared heading styles now use 1.25 line-height, descender padding and visible overflow; main tab titles use solid text rather than clipped gradient fill. The upper-right light was a decorative radial-gradient `orb-drift` in each header, not the account/sync status chip. Those header orbs were removed for all themes.

Validation covers all twenty themes across Home, Health, Habits, Stack and Progress at 390px and 1440px, plus live picker persistence/sync queuing, readable core surface tokens, no header clipping/horizontal overflow, character/text separation, XP/prayer/photo functionality and reduced motion. Token contrast checks use actual base/card surfaces; darker or lighter track tokens do not imply text is placed on them.

## Sectionwide refinement

`theme-sections.css` supplies full-page Pokémon palettes and transparent repeating motifs, selected through the root `data-page` attribute. Health uses Umbreon's moonlit charcoal/gold; Habits uses Gengar's ghostly purple; Stack uses Mewtwo's pale psychic violet; Progress uses Rayquaza's deep sky-green/gold. Home keeps the sky and soft clouds with its welcome/date/day text placed directly on the backdrop. Pokémon's picker thumbnail uses the bundled red/white Poké Ball. All character captions were removed.

Akatsuki interface roles are exclusively black and red families, including pale-red text; original character art and personal photos retain their colors. The supplied Itachi, Orochimaru and Deva Path Pain replace the prior art. Nine lightweight SVG section motifs carry crows/feathers, serpents/scales, Rinnegan/rain/six paths, ritual circles/triple blades, and spiral/loop imagery across full pages. The Akatsuki cloud was redrawn with elongated curls and a pale-red outline. [Research and the distinction between canon and design interpretation](theme-symbolism.md) explain the imagery.

The blank Modern/Pokémon picker background came from broad translucent-surface overrides also matching the full-screen modal backdrop. A dedicated `theme-backdrop` class now stays transparent for these themes while the picker itself remains opaque, preserving live content underneath. Opaque selection layers no longer paint over active navigation labels.

Theme switches now apply tokens before paint without a costly full-screen View Transition snapshot/clip animation. Character/ambient components are memoized; Pokémon/Akatsuki use tiny static page tiles instead of duplicated animated SVG motifs. `dailyos-weather.js` shares in-flight requests and caches successful weather for ten minutes in sessionStorage (`dailyos-weather-v1`, device-local). Home revisits and reloads show the last same-day response immediately while stale data refreshes; errors keep the last response and permit retry. The first uncached load still depends on the weather service. Weather tests cover deduplication, reload/remount, expiry, failure/retry and Los Angeles date rollover.
