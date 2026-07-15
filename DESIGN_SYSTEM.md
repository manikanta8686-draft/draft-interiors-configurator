# Draft Interiors Design System

Phase 5A establishes a reusable visual language for the current website and the future production configurator. The system favours editorial clarity, warm materials, restrained depth, and calm motion.

## Visual moods

The brand language has three intentional modes rather than one visual treatment applied everywhere:

- **Editorial** is used for the homepage and storytelling. It uses generous negative space, larger display typography, concise copy, and photography-led sections.
- **Product** is used for the collection and future product detail pages. Imagery, dimensions, material information, and price remain dominant; decorative elements stay quiet.
- **Configuration** is used for the configurator. Information density is higher, controls are explicit, motion communicates state changes, and the product preview remains the primary focal point.

All three moods consume the same semantic tokens and accessible component states.

## Source of truth

Design tokens live in `client/src/design-tokens.css`. Components should consume semantic tokens instead of introducing page-specific colours, typography, spacing, radii, shadows, or motion curves.

Product data is the intentional exception: fabric swatches and 3D material colours remain data-driven because they describe the configured product rather than the interface.

## Colour roles

- Forest is the primary action colour.
- Bronze is reserved for labels, selected details, and editorial emphasis.
- Walnut supports text actions and material references.
- Ivory, sand, stone, and showroom grey form the surface hierarchy.
- Ink, muted, and subtle form the text hierarchy.
- Success, warning, error, and focus are semantic and must not be substituted with brand colours.

## Typography

- Playfair Display: hero, section, and product titles.
- DM Sans: body copy, navigation, forms, and controls.
- DM Mono: eyebrows, metadata, configuration labels, and technical captions.

Use the named `--type-*` roles. Metadata must remain at least 10px and should never carry long-form content.

## Spacing and layout

Use the nine-step `--space-*` scale (4, 8, 12, 16, 24, 32, 48, 64, 96, and the extended 128 value) and the shared page gutter. Main content is capped by `--container`; editorial introductions use `--content-narrow`.

## Components

- `.button`, `.button-dark`, and `.text-button` define the action hierarchy.
- Collection filters and configurator options share selection, hover, focus, and touch-target behaviour.
- Product cards share surface, elevation, and motion rules.
- Enquiry and saved-configuration forms share input, validation, and status semantics.
- The navigation uses the shared inline icon family and exposes its mobile state to assistive technology.
- `SystemStates.jsx` provides shared skeleton, loading, empty, and error patterns. Forms and notices extend the same state language for success and validation feedback.

New variants should extend these primitives instead of creating page-specific duplicates.

## Shape and elevation

The interface uses restrained 4–16px radii. Cards use `--shadow-card`, larger product/configuration surfaces use `--shadow-panel`, and truly floating controls use `--shadow-floating`. Avoid glass effects unless an element genuinely overlays product imagery.

## Motion

Motion constants live in both CSS tokens and `client/src/motion/premiumMotion.js` for CSS and Framer Motion consumers. Use instant, UI, panel, and viewer durations with the premium non-overshooting easing curve. Every interaction must remain understandable when reduced motion is enabled.

Skeleton shimmer is the only continuous interface animation. It is disabled when reduced motion is requested. Loading states describe activity in text and never rely on animation alone.

## Accessibility baseline

- Interactive targets are at least 42px, and 44px on compact screens.
- Keyboard focus remains visible.
- Selected filters and options expose pressed state.
- Mobile navigation exposes expanded state and its controlled region.
- Colour is not the only indicator of validation or selection.
- New colour combinations must meet WCAG AA contrast before release.

## Phase 5B boundary

The procedural sofa, its product material constants, and the viewer lighting palette are deliberately unchanged in Phase 5A. They will move into a manifest-driven Mercer asset pipeline only after authoritative measurements, views, material references, and semantic mesh names are available.
