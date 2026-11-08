# Source attribution

The locally served media was retrieved from [Flowing's public launch](https://flowing.to/launch) at the user's explicit request for the same canvas imagery. Sources: `/media/launch/tiles-gpu/`, `/media/launch/wall-desktop.webp`, and `/media/launch/wall-phone.webp`. The poster collection, four short motion clips, and still fallbacks total approximately 572 KB.

Media remains the work of its original creators; this repository does not claim original authorship or grant a new media licence. The visible canvas credits Flowing. No authenticated or access-controlled material was accessed.

`src/components/design-canvas.tsx` is an independent Canvas 2D implementation using observed orthographic geometry, locally served posters/video, pointer easing, wheel inertia, and a depth mask. It does not bundle the reference site's compiled renderer, signup code, tracking scripts, or WebGPU application. Its tile ordering and rendering engine differ from the source. Reduced motion uses the reference still composition and starts no video playback.
