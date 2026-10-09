# Private character theme assets

Downloaded 8 October 2026 for the owner's private DailyOS themes. Initially prepared locally; the owner subsequently requested deployment to the existing shared desktop/iPhone GitHub Pages app, whose static assets are public. Character intellectual property remains with its respective owners; third-party download-site labels do not establish permission from the franchise owners.

PNG assets retain real alpha transparency and have phone/desktop variants. PNG resizing used macOS sips. Phone PNGs are at least 240 pixels on their longest side; desktop section art is 475–900 pixels. Render phone section art no wider than 120 CSS pixels for retina sharpness. The Ash phone/desktop images are 360/720 pixels; render no taller than 180/360 CSS pixels. SVG motifs and placeholders scale cleanly on every display.

| Theme / asset | Character | Source |
| --- | --- | --- |
| Pokémon `ash-{phone,desktop}.png` | Ash Ketchum | [PNG Gallery Ash page](https://pnggallery.com/ash-ketchum); downloaded `https://pnggallery.com/wp-content/uploads/ash-ketchum-01.png` (site labels CC BY-NC 4.0) |
| Pokémon `pikachu-{phone,desktop}.png` | Pikachu | [Official Pokédex](https://www.pokemon.com/us/pokedex/pikachu); downloaded `https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png` |
| Pokémon `health-{phone,desktop}.png` | Umbreon | [Official Pokédex](https://www.pokemon.com/us/pokedex/umbreon); downloaded `https://assets.pokemon.com/assets/cms2/img/pokedex/full/197.png` |
| Pokémon `habits-{phone,desktop}.png` | Gengar | [Official Pokédex](https://www.pokemon.com/us/pokedex/gengar); downloaded `https://assets.pokemon.com/assets/cms2/img/pokedex/full/094.png` |
| Pokémon `stack-{phone,desktop}.png` | Mewtwo | [Official Pokédex](https://www.pokemon.com/us/pokedex/mewtwo); downloaded `https://assets.pokemon.com/assets/cms2/img/pokedex/full/150.png` |
| Pokémon `progress-{phone,desktop}.png` | Rayquaza | [Official Pokédex](https://www.pokemon.com/us/pokedex/rayquaza); downloaded `https://assets.pokemon.com/assets/cms2/img/pokedex/full/384.png` |
| Akatsuki `home-{phone,desktop}.png` | Itachi Uchiha | [FreePNGimg Itachi source](https://freepngimg.com/png/33543-itachi-uchiha-transparent); downloaded `https://freepngimg.com/download/naruto/33543-9-itachi-uchiha-transparent.png` (site labels CC BY-NC 4.0, uploader John Reeks) |
| Akatsuki `health-{phone,desktop}.png` | Orochimaru portrait and snake | [PNG All Orochimaru gallery](https://www.pngall.com/orochimaru-png/); downloaded `https://www.pngall.com/wp-content/uploads/15/Orochimaru-PNG-Images.png` (site labels personal use) |
| Akatsuki `habits-{phone,desktop}.png` | Pain | [PNG Gallery Naruto Pain page](https://pnggallery.com/naruto-pain); downloaded `https://pnggallery.com/wp-content/uploads/naruto-pain-01.png` (site labels CC BY-NC 4.0) |
| Akatsuki `stack-{phone,desktop}.png` | Hidan | [Owner-supplied WallpaperCat image](https://wallpapercat.com/w/full/a/a/c/738377-1932x2572-iphone-hd-hidan-background.jpg); white background removed with built-in imagegen, refined alpha, local 360/900px PNG variants |
| Akatsuki `progress-{phone,desktop}.png` | Tobi | [Owner-supplied Google image thumbnail](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM8hEGk6oBhVO6QmxsElqvP7wPPe0DDD0TGBW_vH8P_w&s=10), 324×617 source; transparent cutout and edge refinement with built-in imagegen, local 360/900px variants |
| Akatsuki `crow.svg` | Crow | Original vector motif |

## Images still needed

None. All requested characters now have bundled transparent artwork. The supplied Tobi image is a low-resolution Google thumbnail; its cutout edges were refined for header display rather than claiming to recover original high-resolution detail. Orochimaru is supplied as a clean head-and-snake composition, rather than a full body render. Hidan now uses the owner-supplied image with its white background removed; white character details are preserved.

## Tobi cutout update

Built-in imagegen produced a transparent cutout from the owner's 324×617 Google thumbnail. Local PNG variants are `akatsuki/progress-phone.png` (189×360) and `akatsuki/progress-desktop.png` (472×900), resized with sips and precached for offline use. The upscaled edge refinement is not a replacement for an original high-resolution source. The owner subsequently requested publishing the shared app with these bundled assets.

Prompt: "Use case: background-extraction. Edit target: the supplied Tobi/Obito anime illustration, a small 324x617 reference. Remove only the white background and white empty gaps, creating actual transparent PNG alpha. Preserve the exact full-body pose, orange spiral mask with black eye hole, spiky dark hair, hand held to the chin, long dark olive-black Akatsuki cloak with red clouds and white outlines, sandals and pale leg wraps. Preserve the original art composition, outlines and colors. Refine and smoothly antialias the low-resolution edges for a clean app cutout at a taller resolution; do not change identity, outfit, pose or add detail that changes the illustration. All pixels outside the true dark subject outline must be completely transparent with no white speckles, colored fringe, shadow or halo. Preserve white cloud outlines and pale leg clothing inside the character. Entire head and sandals visible, with a small transparent margin. No background, added effects, text or new characters."

## Visual research

### Hidan cutout update

Built-in imagegen was used for background extraction and a second alpha-edge refinement; the selected output was resized with sips into `akatsuki/stack-phone.png` (270×360) and `akatsuki/stack-desktop.png` (676×900). Both preserve actual PNG transparency and are precached for offline use. The owner subsequently requested publishing the shared app with these bundled assets.

Extraction prompt: "Use case: background-extraction. Edit target: the supplied Hidan character illustration. Remove only the white background, including white empty gaps between the scythe blades, chain, arms and body. Preserve Hidan's exact appearance, face, pose, original anime line art, colors, clothing, triple-bladed scythe and chain. Preserve white details that belong to the character: cloud outlines, leg wraps and scythe handle wrapping. Retain the entire character and entire weapon, without cropping. Output a clean actual transparent-alpha PNG cutout, tightly framed with a small transparent margin. No added effects, shadows, halo, background, text, redesign, or new illustration. This is a private app character asset."

Refinement prompt: "Use case: background-extraction. Refine ONLY the alpha boundary of this transparent Hidan cutout. It currently has stray white speckles and colored fringe outside the dark character outlines, especially around the scythe's outer edge and around the white shin wraps. Remove all disconnected background remnants and edge halos. Preserve the entire subject and scythe, exact colors, original drawing, all details inside the black outlines, white cloud outlines and white leg wraps. Use a smooth antialiased alpha edge hugging the true dark outline. Keep 12 pixels clear transparent margin on all sides; don't crop weapon tips. Background must be truly transparent, no shadow. Do not redraw or stylize."

- [Official Pokémon animation overview](https://parents.pokemon.com/en-us/animation/) explicitly connects the series to friendship, cooperation and working toward becoming the best.
- [Pokémon: I Choose You!](https://www.pokemon.com/us/animation/movies/pokemon-the-movie-i-choose-you) describes Ash and Pikachu becoming close partners and embarking on a shared adventure.
- Pokémon type motifs: Umbreon is Dark (moon/rings), Gengar is Ghost/Poison (playful purple spirit), Mewtwo is Psychic (violet), and Rayquaza is Dragon/Flying (green sky serpent). Their established abilities are Synchronize, Cursed Body, Pressure and Air Lock respectively; these are decorative identity cues, never app behavior.
- [Official Naruto Noir Edge Itachi feature](https://naruto-official.com/en/news/01_2624) describes monochrome with crimson accents, Sharingan red, and crow wings emerging from Itachi's cloak.
- [Official Akatsuki figure project](https://naruto-official.com/en/news/01_2348) identifies the group and characters.
- [Akatsuki background reference](https://naruto.fandom.com/wiki/Akatsuki) provides the red-cloud cloak identity and the organization's evolution through loss and ambition. Pain/loss symbolism is narrative visual inspiration and is not health guidance.
