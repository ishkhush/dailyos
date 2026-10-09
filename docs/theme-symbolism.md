# Character themes: sectionwide symbolism

Research checked October 8, 2026. These identities are expressed through decorative backgrounds, surfaces, accents and completion details. They do not rename controls or change their behavior. Character caption boxes are unnecessary: the art and motifs carry the identity.

## Pokémon

| Section | Canon grounding | Visual interpretation for DailyOS |
|---|---|---|
| Home | Pokémon stories emphasize the relationship between people and Pokémon; Ash and Pikachu share their adventures. | Clear blue sky, clouds, warm yellow, authentic red/white Poké Balls and open greeting composition express friendship, optimism and beginning another day together. |
| Health / Umbreon | Dark type; Moonlight Pokémon; Synchronize ability; rings respond to moonlight. | Deep midnight and charcoal surfaces across the page, gold rings, moon and sparse stars. The quiet feeling suggests recovery and steady care; that health association is an interpretation, not a canonical personality claim. |
| Habits / Gengar | Ghost/Poison type; Shadow Pokémon; Cursed Body ability; shadow and illusion appearances in the anime. | Purple surfaces, lilac details and sparse shadow wisps express playful mischief. Celebrating small wins is an app association, not a claim that Gengar canonically represents discipline. |
| Stack / Mewtwo | Psychic type; Genetic Pokémon; Pressure ability; created through genetic manipulation. | Pale mineral lavender, deep violet text and elliptical psychic waves suggest concentration, deliberate choices and control. Identity and self-direction are interpretive themes rather than health claims. |
| Progress / Rayquaza | Dragon/Flying type; Sky High Pokémon; Air Lock ability; legends describe it ending the Kyogre/Groudon clash. | Forest and emerald across the whole page, gold diamond markings and broad sky currents. High altitude and balance suggest long-range growth and looking beyond a single day. |

Sources: [official Pokémon introduction](https://in.portal-pokemon.com/about/), [Umbreon Pokédex](https://sg.portal-pokemon.com/pokedex/0197/), [Gengar Pokédex](https://in.portal-pokemon.com/pokedex/0094/), [Gengar illusion episode](https://www.pokemon.com/us/animation/seasons/4/episode-24-a-ghost-of-a-chance), [Mewtwo Pokédex](https://in.portal-pokemon.com/pokedex/0150/), [Rayquaza Pokédex](https://in.portal-pokemon.com/pokedex/0384/). Color choices follow the supplied character art, rather than generic type-label colors.

## Akatsuki

Use exclusively black/charcoal and red-family interface colors, including pale blush reds for readable text and cloud outlines. Character artwork preserves its own colors. Red clouds should have the recognizable elongated silhouette, curling lobes and outlined interior curves, rather than ordinary rounded weather clouds. The cloud geometry is a locally drawn interpretation of the cloak emblem.

| Section | Canon grounding | Visual interpretation for DailyOS |
|---|---|---|
| Home / Itachi | His story centers on the cost of protecting what matters, his brother and village. Crow techniques and ocular illusions are recognizable visual associations. | Red-on-ink crows, feather fragments and watchful circular details continue below the header. Protection and resolve are expressed visually without decorative slogans. |
| Health / Orochimaru | His pursuit of eternal life and knowledge includes forbidden experimentation and replacing bodies. Serpents are a defining visual identity. | Serpentine paths and shedding-scale marks on dark surfaces suggest transformation and renewal. The app association with self-care is interpretive; his actions are not presented as a health ideal. |
| Habits / Pain | Nagato's painful past shapes his pessimism about peace; the Six Paths, concentric Rinnegan and Rain Village are recognizable story motifs. | Rain strokes, six-point clusters and red concentric rings evoke repetition, shared pain and the possibility of breaking cycles. Habit discipline is an app interpretation. |
| Stack / Hidan | A devoted Jashin follower; ritual mode and signature three-bladed scythe are prominent. | Restrained circle/triangle ritual seals and triple strokes express repeated ritual without depicting violence. His immortality is fictional, not connected to supplements' effects. |
| Progress / Tobi (Obito) | His childhood aspirations, losses and despair reshape his identity; the mask conceals him, and his story ultimately returns to bonds and action. | Red spiral-mask geometry and distant looping paths suggest a complicated journey and a changing self. Infinity loops are an interpretive motif for his dream-world ambition, not an exact canonical emblem. |

Sources: [Itachi retrospective](https://naruto-official.com/en/news/01_1814), [Itachi crow techniques in the licensed game](https://naruto.narutowebgame.com/en/strategy/gamestrategy/itachi_uchiha_introduction_called_the_shadow_of_the_moon), [Orochimaru retrospective](https://naruto-official.com/en/news/01_1629), [Nagato's painful past](https://naruto-official.com/en/anime/naruto2/list/01_618), [Hidan retrospective](https://naruto-official.com/en/news/01_1749), [official Akatsuki figure details for Hidan/Tobi](https://naruto-official.com/en/news/01_2338), [Obito retrospective](https://naruto-official.com/en/news/01_1706).

## Local motif assets

`assets/themes/motifs/{umbreon,gengar,mewtwo,rayquaza,itachi,orochimaru,pain,hidan,tobi}.svg` are transparent 480 × 560 tiles with restrained internal opacity. They have no scripts, external resources, fonts, filters or animations. `assets/themes/red-cloud.svg` is the outlined cloud accent. All assets remain sharp at phone/desktop/retina resolutions. The rendering CSS owns placement and motion, including reduced-motion behavior.
