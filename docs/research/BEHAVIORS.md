# Behaviours measured on ingrassiadaniel.it (reference only)

Interaction models, thresholds and transitions observed on the reference site, 1440x900 and 390x844.
Everything here is implemented in this project's own code; the reference's text, media, name and logo are not used.

## Global
- Smooth scroll: Lenis. Custom cursor on fine pointers only. Film grain overlay at 10% opacity, 3s stepped loop.
- One fixed WebGL canvas behind all content: additive point sprites, no depth write, 44,000 points (22,000 on coarse pointers).
- Point data format PPT1: `"PPT1"`, uint32 count, float32 scale, then count * {int16 x, y, z, uint8 luma, pad}.
- Palette: background #222124, foreground #f0f2f0, muted #8b8f8c, accents #f4ce15 and #379777. Font: Inter Tight.
- Type scale is viewport-relative: `vw` on landscape, `vh` on portrait.

## Time-driven
| Element | Behaviour |
| --- | --- |
| Preloader | First session visit only. Ring of dots holds; counter fades in at 3s, counts 3.5-5.5s (t^3 curve); hides at +0.5s; ring releases over 2s from +0.9s; scroll unlocks when it ends. |
| Formation | Points swirl from a random scatter into the bust over 4s, staggered per point. |
| Idle | Slow head drift, twinkle on every point, ring text rotates once per 36s. |

## Scroll-driven (positions in viewport heights, smoothstep unless noted)
| Range | Effect |
| --- | --- |
| 0-1 | Bust scales up 20%, turns -0.6 rad, drifts +0.15 view-widths and -0.09 view-heights |
| 1-1.6 | Bust morphs to globe. Ring text shows once the morph passes 85% |
| 2.3-3.0 | Globe morphs to map. Label shows at the end of the morph |
| 3.4-4.0 | Map morphs to double helix, tilted 0.35 rad and offset -0.22 view-widths |
| 4.0-5.5 | Helix slides and spins, camera orbits pi/7, scale +60%; body line visible until 85% of this range |
| Works | Section height derives from tile count. Track translates with a quintic ease; reveal span 2vh. Velocity warps tile edges. |
| Last 40% of Works travel | Helix turns into a tunnel; closing line appears past 50% of that |
| Contact | Points trace a rectangle around the email as it reaches viewport centre (quintic on distance from centre) |

## Pointer-driven
- Bust turns toward the pointer (max 0.22 rad, soft limited); points near the pointer brighten.
- Cursor: 8px dot follows at 0.28 lerp with a 150ms tapered trail; grows to a 40px ring over links.
- Tiles: hover adds edge warp and a drop shadow.
- Email, LinkedIn, footer link: on enter, a mask wipes the text behind a sweep of particles, then the text blurs back in. 1s cooldown.
- Footer mark: fills with colour and shows a tooltip for 3s.

## Responsive (portrait)
- Hero labels stack to opposite corners. Copy blocks go full width. Tiles 85vw, track travel rate 0.6.
- Bust fits by height only, so it crops at the sides. Globe scale 0.6, map scale 0.7. Ring 55.2vh.
- Background stars culled to 35% during the preloader.
