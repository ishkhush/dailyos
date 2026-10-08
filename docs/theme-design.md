# Six visual identities

The six additions use muted, multi-hue palettes rather than the existing monochrome accent families. They preserve app structure and urgent alerts, prayer emphasis, XP and photo colors. Each has separate fonts, material, card geometry, line-icon treatment and layered SVG motifs. Font fallbacks work offline; the service worker can retain downloaded font responses.

| Theme | Symbolism | Palette and material | Font pair (display / body) |
| --- | --- | --- | --- |
| Modern | Interlocking geometry suggests clarity and space to breathe. | Slate, mint, periwinkle; crisp glass with a fine architectural grid. | Outfit / Manrope |
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
| Modern | 5.89 | 6.19 | 8.80 |
| Vintage | 5.48 | 6.02 | 8.95 |
| Zen Garden | 5.31 | 5.56 | 8.33 |
| Tidal Lagoon | 5.48 | 5.76 | 8.51 |
| Desert Loom | 5.04 | 5.46 | 8.30 |
| Observatory | 5.55 | 6.47 | 9.78 |

These are token-pair checks, not a claim of a full accessibility audit of every inherited opacity, image overlay or disabled control. The existing reduced-motion rule disables ambient and preview animation and transitions; hidden documents pause ambient motifs. Mobile retains two picker columns, while desktop uses three in a wider sheet. Miniatures render actual theme tokens, fonts, materials, geometry and XP styling. Tapping switches the app immediately while leaving the picker open for comparison; Done closes it.

Selection remains `dos_theme_v1`, which is already included in the durable sync records and backups. No storage migration or new key is required.
