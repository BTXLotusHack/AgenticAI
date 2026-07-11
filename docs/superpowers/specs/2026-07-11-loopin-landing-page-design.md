# Loopin landing page design

**Date:** 2026-07-11
**Status:** Written design baseline for user review

## Objective

Create a consumer-first Loopin landing page that converts real group-trip users while demonstrating enough product intelligence, operational credibility and business breadth to persuade hackathon judges and future Tasco partners.

The page is a React and Vite public experience deployed as static assets through S3 and CloudFront. It does not require the application backend to tell its core story.

## Audience and conversion

Primary audience:

- Families, friends, motorcycle groups and other real users planning a multi-vehicle trip.

Secondary audience:

- Hackathon judges, Tasco stakeholders, tourism operators, event organizers, clubs and future fleet partners.

Primary CTA:

> Start a group drive

Secondary CTA:

> See how it works

Partner CTA:

> Bring Loopin to your organization

The consumer CTA remains visually dominant. The partner pathway appears after the product has been explained.

## Reference synthesis

The design preserves the old Loopin prototype's friendly green, warm neutral surfaces, rounded details, travel photography and approachable language. It removes the old page's generic SaaS feature-card grid, fabricated statistics, unverified testimonials and premature pricing table.

Reference principles:

- Life360: private-circle safety and peace-of-mind framing without parental-surveillance language — <https://intl.life360.com/location-sharing>
- Strava: GPS-powered community energy and route-based identity — <https://www.strava.com/>
- Polarsteps: travel routes as emotional stories — <https://www.polarsteps.com/>
- 21st.dev Parallax: restrained scroll-linked depth — <https://21st.dev/community/components/youcefbnm/parallax/default>
- 21st.dev Text Reveal: word-level scroll reveal — <https://21st.dev/community/components/dillionverma/text-reveal>
- 21st.dev World Map: programmatic path and node motion — <https://21st.dev/community/components/aceternity/world-map>

These references inform principles and interaction patterns. Their brand assets, prose and layouts are not copied.

## Visual thesis

> A warm editorial road-trip poster where one living green route thread keeps every person part of the journey.

The experience is human rather than corporate, safe without appearing clinical, social without resembling a feed, and technically credible without looking like fleet software.

## Design system

### Color

```text
Loopin green   #18724B
Deep road ink  #13251C
Warm bone      #F4F1E8
Soft sage      #DCE8DE
White          #FFFFFF
Safety amber   semantic stretched/separated state only
```

Green is the single brand accent. Amber is not decorative; it indicates a real state transition in the product demonstration.

### Typography

- Display and brand: Bricolage Grotesque or a verified metrically suitable equivalent.
- Body and controls: Figtree or a verified accessible equivalent.
- Maximum two families, with a minimal weight set and self-hosted or licensed web delivery.

### Shape and layout

- Full-bleed hero.
- Editorial asymmetry balanced by strict alignment.
- Large image crops and route geometry.
- Restrained radii on controls and functional notification surfaces.
- No general-purpose card grid.

## Content plan

### 1. Hero — establish the promise

The navigation overlays a full-bleed Vietnamese road-trip image or short optimized media loop. A green route line and five vehicle nodes animate into formation.

```text
Loopin

Every car.
One journey.

Plan together, stay connected, and regroup safely—
without turning the drive into a group chat.

[Start a group drive]  [See how it works]
```

Navigation:

```text
How it works   Safety   For organizations   Log in   Start a drive
```

The hero contains no floating dashboard, testimonial, statistic strip or logo cloud.

### 2. Sticky route story — prove the intelligence

One sticky product scene demonstrates:

1. Five nodes traveling together.
2. The Car 3–Car 4 boundary stretching.
3. The edge changing from green to semantic amber.
4. Front and rear components receiving different messages.
5. A forward safe regroup point being selected.
6. Components reconnecting.

Headline:

> Loopin understands the whole group—not just your dot on a map.

The animated scene is backed by visible text so the explanation survives reduced motion and assistive technology.

### 3. Human benefits — explain

An editorial numbered layout replaces feature cards:

```text
01  Know the group
    See everyone on the shared route with honest location freshness.

02  Catch the gap
    Route-aware intelligence notices when the convoy begins to separate.

03  Regroup safely
    Get a forward, suitable meeting point without telling anyone to rush.
```

### 4. Social trip moment — deepen

An image-led strip presents family trips, friends, clubs and tourism groups.

Headline:

> Less “Where are you?” More “We’ve got you.”

This section communicates belonging and private coordination rather than a public social feed.

### 5. Low-distraction voice — demonstrate safety

A driver-focused image and concise alert:

> Cars 4 and 5 are behind. Maintain a safe pace while the leader coordinates.

Supporting copy:

> Short voice alerts. Clear next actions. Less screen time while moving.

### 6. Privacy — build trust

Text-led content explains consent-based location, trip-scoped visibility, automatic expiry, and honest stale/offline status.

Headline:

> Your trip stays with your group.

### 7. Business breadth — signal the model

An understated section lists:

```text
Families   Clubs   Tours   Events   Fleets
```

The future business model combines a free or accessible consumer coordination layer with paid organization capabilities such as managed groups, operator dashboards, policy profiles, analytics and integrations. Exact packaging and pricing are not claimed on this page before validation.

### 8. Final CTA — convert

Full green field:

> Keep the journey together.

> Start your first group drive.

## Interaction thesis

### Motion 1: route entrance

- Navigation settles in quickly.
- Brand and headline reveal with a restrained stagger.
- The route draws origin-to-destination.
- Five nodes enter sequentially and settle into continuous calm movement.

### Motion 2: convoy separation story

- Scroll progress controls route-node positions inside a sticky scene.
- The boundary gap expands and edge state changes semantically.
- Component labels and recipient-specific notifications appear.
- A regroup path draws and the convoy reconnects.

This adapts 21st.dev parallax/path concepts to Loopin's real graph model rather than importing a decorative demo unchanged.

### Motion 3: editorial reveal

- One word-level reveal supports the core product statement.
- Photographs move at subtly different depths.
- CTA hover extends a route-line arrow.

All motion respects `prefers-reduced-motion`, uses a complete static state, avoids scroll hijacking, and cannot delay the primary CTA.

## Responsive behavior

### Desktop

- Full-bleed cinematic hero with a narrow text column.
- Sticky route story with clear boundary and component labels.
- Asymmetric editorial images aligned to a consistent grid.

### Mobile

- Portrait crop with protected text contrast.
- Primary CTA remains in the first viewport.
- Sticky story becomes three shorter scenes when necessary.
- Vehicle nodes and labels remain legible without horizontal scrolling.
- Motion intensity reduces for performance and accessibility.

## Component architecture

Proposed public-page modules:

```text
LandingPage
├── LandingNav
├── HeroRoute
├── ConvoyStory
│   ├── RouteScene
│   ├── VehicleNode
│   ├── ComponentBoundary
│   └── RoleAlert
├── BenefitSequence
├── SocialJourney
├── VoiceSafety
├── PrivacyStatement
├── OrganizationPath
├── FinalCta
└── LandingFooter
```

- Copy and navigation data remain separate from animation logic.
- Motion primitives are reusable and reduced-motion aware.
- ConvoyStory consumes deterministic scene data rather than embedding timing throughout JSX.
- External assets have a documented source and license.

## Technical direction

- React 19, Vite and TypeScript.
- React Router for public and future application routes.
- Tailwind CSS and shared design tokens.
- Motion/Framer Motion for orchestrated route and scroll animation.
- 21st.dev components are adapted only after code, accessibility, dependency and license review.
- Responsive images with explicit dimensions and optimized formats.
- Static S3/CloudFront compatibility; no SSR dependency.

## Accessibility and safety

- WCAG 2.2 AA color contrast and keyboard behavior.
- Semantic landmarks and one logical heading hierarchy.
- Route animation facts duplicated in readable text.
- Color never acts as the only separation indicator.
- Reduced-motion mode shows the complete connected, split and regroup story without animation.
- No instruction tells a driver to speed, brake suddenly or stop at an unverified place.
- Public marketing does not claim collision-avoidance precision.

## Performance requirements

- Hero media is responsive, explicitly sized and the only eagerly loaded large asset.
- Below-the-fold imagery and motion code load lazily.
- Animation favors transforms and opacity.
- Font delivery is limited to two families and essential weights.
- No continuous offscreen animation.
- Production build is tested on a mid-tier mobile profile for Core Web Vitals, main-thread blocking and layout shift.

## Analytics

Track privacy-respectful product events rather than invasive session replay by default:

```text
landing_viewed
primary_cta_clicked
how_it_works_started
how_it_works_completed
safety_section_viewed
organization_cta_clicked
login_clicked
```

No precise location or trip data is attached to public-page analytics.

## Verification

- Unit tests for deterministic convoy story scenes and reduced-motion state.
- Component tests for navigation, CTAs and accessible labels.
- Playwright tests for desktop/mobile navigation and CTA flows.
- Automated accessibility scan plus keyboard review.
- Screenshot review at 360, 390, 768, 1024, 1280 and 1440 widths.
- Browser inspection of all motion and reduced-motion modes.
- Production build and performance audit.
- External asset source and license audit.
- No console errors, horizontal overflow or broken responsive crops.

## Error and degraded behavior

- Failed hero media falls back to a designed poster image and solid contrast layer.
- Unsupported or reduced motion renders a complete static route narrative.
- Missing optional below-the-fold image does not remove its text meaning.
- CTA routes remain functional without animation libraries.
- Analytics failure is silent and does not block interaction.

## Implementation gate

This specification must be reviewed by the user before Obra's `writing-plans` workflow creates the task-level implementation plan. Frontend implementation begins only after that plan is approved.
