# Page topology

Fixed layers, back to front: `ParticleScene` (z 0), `main.content` (z 1), `Preloader` (z 3), grain and `Cursor` (z 10).

| # | Section | Component | Height at 900px | Interaction model | Content source |
| --- | --- | --- | --- | --- | --- |
| 1 | Hero | `Hero.tsx` | 100svh | Time, pointer | name, role |
| 2 | Statement | `page.tsx` | 100svh | Scroll reveal | resume summary |
| 3 | Globe ring | `World.tsx` | 100svh | Scroll, time | languages |
| 4 | Location | `page.tsx` | 100svh | Scroll | Holon, Israel |
| 5 | Approach | `page.tsx` | 210svh | Scroll | resume summary |
| 6 | Works | `Works.tsx`, `WarpTile.tsx`, `covers.ts` | computed, 4198px | Scroll, hover | resume projects |
| 7 | Contact and footer | `Contact.tsx`, `Dust.tsx`, `Footer.tsx` | 100svh | Scroll, hover | email, LinkedIn |

All copy lives in `src/content/site.ts`. Scene and sections share per-frame values through `src/lib/stage.ts`.

## Generated assets
| File | Script | Notes |
| --- | --- | --- |
| `public/portrait.bin` | `scripts/make-cornrows.py` | Bust with procedural cornrows, from `assets-src/portrait.source.bin` |
| `public/location.bin` | `scripts/make-location.mjs` | Israel outline from Natural Earth 1:50m via `world-atlas` |
| `public/noise.jpg` | `scripts/make-noise.py` | Film grain |
| `public/works/4thecrowd.jpg` | screenshot of 4thecrowd.com | Project media |

The other three project tiles use covers drawn in `src/components/covers.ts`. To replace one, add a jpg, png or mp4 to `public/works/` and set `media` on that project in `site.ts`.
