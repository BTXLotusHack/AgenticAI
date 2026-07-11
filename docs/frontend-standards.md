# Frontend experience standards

These rules apply to visually led public pages and product surfaces in Loopin. They supplement the product, safety and accessibility specifications.

## Required design workflow

Before implementing or materially changing a landing page, website, prototype or visually led application surface:

1. Invoke the repository's `frontend-skill` instructions.
2. Write a one-sentence visual thesis.
3. Write a content plan that gives every section one responsibility.
4. Write an interaction thesis containing two or three purposeful motions.
5. Present the design and receive approval before implementation.
6. Add or update a written design specification.

## Composition

- Start with composition, hierarchy and narrative rather than a component inventory.
- A branded landing-page hero is full bleed; constrain only its internal copy column.
- The product name is the loudest brand signal in the first viewport.
- The first viewport has one dominant visual idea and one primary action.
- Prefer editorial sections, media, columns, dividers and whitespace over card grids.
- Do not use hero cards, logo clouds, statistic strips, pill collections or dashboard mosaics by default.
- Use cards only when the card itself is the interaction or represents a genuinely discrete object.
- Use no more than two typefaces and one brand accent without an approved design-system reason.

## Content

- Public copy describes user value, not implementation or design commentary.
- Headings must communicate the page when scanned without body text.
- Supporting copy is short and nonrepetitive.
- Do not fabricate adoption statistics, testimonials, awards, partnerships, pricing or customer logos.
- Business and partner content remains secondary when real users are the primary audience.
- Driving messages follow `docs/safety-security-privacy.md`; never instruct speeding or sudden braking.

## Imagery and references

- Use at least one strong, real-looking image on a consumer landing page.
- Images must perform narrative work and provide a calm tonal region for overlaid text.
- Prefer in-situ group-drive, departure, road and regroup moments over abstract gradients or fake 3D objects.
- Do not copy or redistribute social-media or competitor assets.
- External assets require a license compatible with repository and deployment use, recorded attribution when required, and stable hosting or checked-in optimization.
- Use references for principles and composition, not visual imitation.

## Motion

Visually led work ships with two or three intentional motions:

- One entrance sequence that establishes hierarchy.
- One scroll-linked, sticky or depth effect that explains product behavior.
- One hover, reveal or layout transition that clarifies affordance.

Motion must:

- Be visible enough to communicate in a short demonstration.
- Use transforms and opacity where practical.
- Avoid layout shift and scroll hijacking.
- Remain smooth on representative mobile devices.
- Stop or reduce work when offscreen.
- Respect `prefers-reduced-motion` with a complete static alternative.
- Never delay access to the primary CTA or essential information.

21st.dev components may be adapted through their documented installation method, but imported code must be reviewed for accessibility, bundle cost, framework compatibility, licensing and fit with the Loopin design system. Avoid adding an animation dependency for a single trivial effect.

## Responsive design

- Validate at 360, 390, 768, 1024, 1280 and 1440 CSS-pixel widths, with a 320-pixel compact-width overflow guard.
- Persistent navigation plus hero content must fit the initial viewport at common desktop and mobile sizes.
- Touch targets are at least 44 by 44 CSS pixels where practical.
- No horizontal overflow is allowed.
- Entrance transforms must not expand the document width; clip the owning workspace while preserving deliberate nested scrollers.
- Text remains readable over every responsive image crop.
- Sticky desktop stories become shorter scenes on mobile when sustained pinning harms usability.

## Accessibility

- Meet WCAG 2.2 AA contrast and interaction expectations.
- Use semantic landmarks and a logical heading hierarchy.
- Every interactive element is keyboard accessible with a visible focus state.
- Meaning is not communicated by color or motion alone.
- Images have useful alternative text or are explicitly decorative.
- Animated route stories expose the same facts in readable text.
- Motion and video honor reduced-motion and pause expectations.

## Performance

Initial landing-page budgets on a production build:

- Avoid unnecessary JavaScript for static content.
- Lazy-load below-the-fold media and motion modules.
- Serve responsive AVIF/WebP images with explicit dimensions.
- Preload only the hero asset and essential font subset.
- Keep font families to two and limit weights.
- Target Core Web Vitals in the good range on a mid-tier mobile profile.
- Treat animation CPU/GPU cost and main-thread blocking as release concerns.

## Verification gate

Before committing visually led frontend work:

- Run lint, type-check, unit tests and production build.
- Verify keyboard navigation and reduced motion.
- Run automated accessibility checks.
- Capture and inspect desktop and mobile screenshots.
- Exercise motion, menu and CTA behavior in a real browser.
- Check for overflow, image cropping, layout shift and console errors.
- Record external asset sources and licenses.
- Run a performance audit appropriate to the change.
