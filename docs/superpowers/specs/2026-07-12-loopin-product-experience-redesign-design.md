# Loopin product experience redesign

**Date:** 2026-07-12

**Status:** Approved design baseline

**Branch:** `codex/product-experience-redesign`

## 1. Objective

Redesign every Loopin web page except the public landing page. The product experience should combine the useful trip-planning structure of the supplied `trip-itinerary-generation` reference with the current landing page's stronger Loopin identity. The result must feel like one coherent platform across trip planning, place discovery, community activity and real-time convoy coordination.

The landing page layout and content remain unchanged. Its font loading and inheritance will be audited so the original typography renders consistently.

## 2. Visual thesis

> A warm, editorial travel companion that becomes a focused road-operations instrument when a group trip goes live.

Planning, Explore, Community, Profile and Settings use warm bone surfaces, Loopin green, destination photography, open composition and approachable language. Live route monitoring, regroup decisions and safety-critical states transition into a deep forest workspace with restrained amber alerts.

The product uses one identity with two operational moods rather than two unrelated themes.

### Typography

- Bricolage Grotesque is reserved for expressive destination titles, major trip titles and branded moments.
- Figtree is used for navigation, controls, body copy, tables, labels and operational data.
- App headings use product-scale typography rather than landing-page hero scale.
- The landing page keeps its existing type system and composition.
- Font imports, variable weights, fallback behavior and cross-file inheritance must be verified in the rendered app.

### Color and material

- Warm bone is the default planning and community surface.
- Loopin green identifies primary actions, coordinated travel and positive status.
- Deep forest is reserved for maps and live operational surfaces.
- Safety amber is used only for uncertainty, stale telemetry, stretching, separation or a decision requiring attention.
- Red is reserved for destructive actions and confirmed failures.
- Dividers, spacing and surface tone establish hierarchy before shadows or containers.

### Composition

- Cards are used only when the card itself is selectable or represents a portable object such as a trip, place, review or regroup option.
- Page structure, settings, metrics and informational groupings use open layout and dividers.
- Photography does narrative work on travel and place surfaces; operational pages prioritize the route and current state.
- Each viewport has one dominant working area and one primary action.

### Motion

- Route lines draw or update to communicate progress.
- Page and section entrances establish hierarchy without delaying interaction.
- Vehicle markers interpolate between trustworthy route-progress updates.
- Navigation indicators and mobile sheets transition consistently.
- Reduced-motion users receive complete static states with no loss of information.

## 3. Responsive application shell

All authenticated product routes share one responsive shell.

### Desktop

- Compact left navigation rail.
- Contextual top bar with page or trip context, freshness/status and account access.
- Primary workspace in the center.
- Optional right inspector for selected places, trip details, live evidence or moderation context.

### Tablet

- Collapsible navigation rail.
- Two-column workspace where useful.
- Inspectors become drawers when space is insufficient.

### Mobile

- Bottom navigation for Home, Trips, Explore, Now and Profile.
- Secondary destinations are available from contextual menus.
- Maps and the driver's current instruction take priority during live trips.
- Evidence and secondary controls open in accessible sheets.

Existing URLs and deep links remain valid throughout the redesign.

## 4. Page architecture

### 4.1 Authentication and onboarding

Routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/onboarding`

Authentication pages use a calm split layout with a destination image, concise form, clear alternate-auth links and explicit fixture behavior. Onboarding becomes a staged preference flow covering travel style, interests, budget, companions, dietary needs, location consent and notification preferences.

### 4.2 Home and trip library

Routes:

- `/app`
- `/app/trips`

The dashboard leads with the next relevant trip, its readiness state and the most useful action. Supporting areas show recent trips, suggested Tasco places, community activity and a compact planning prompt.

The trip library groups trips by meaningful lifecycle and supports visible filters for draft, ready, active, completed and archived trips. Each trip object exposes destination, timing, member/readiness context, route freshness and its next action.

### 4.3 Trip planning and management

Routes:

- `/app/trips/new`
- `/app/trips/:tripId`
- `/app/trips/:tripId/itinerary`
- `/app/trips/:tripId/share`
- `/trip/new`

Trip planning is a staged workspace:

1. Destination and dates.
2. Travel and group preferences.
3. Tasco place discovery.
4. Route and stop arrangement.
5. Group members and permissions.
6. Review and save.

On larger screens, route context remains visible beside search and planning controls. The itinerary is a day-by-day timeline containing stops, route legs, times, cost, notes and route validation. The trip overview becomes the central hub for route summary, group readiness, itinerary, sharing, privacy and trip launch.

Sharing includes a join link, join code, QR representation, permission explanation and a preview of what an invitee can access.

The legacy `/trip/new` demo route remains supported and visually aligned with the new system.

### 4.4 Explore and places

Routes:

- `/app/explore`
- `/app/places/:placeId`
- `/app/places/:placeId/reviews`

Explore is a Tasco-backed map-and-feed surface. Filters include category, route proximity, rating, open status when available, parking and group suitability. The map provider boundary owns loading, errors, attribution and fixture fallback.

Place detail visibly separates Tasco facts from Loopin community ratings and comments. Review pages include rating distribution, trip context, sorting, moderation/reporting and review composition without presenting community data as Tasco data.

### 4.5 Live coordination and summary

Routes:

- `/app/now`
- `/app/trips/:tripId/live`
- `/app/trips/:tripId/summary`
- `/trips/TRIP001/live`
- `/trips/TRIP001/summary`

Now is the day-of-trip command center. Live trip uses the dark operational workspace with:

- Tasco route context or explicit fixture fallback.
- Vehicle nodes ordered by stable route progress.
- Member freshness and confidence.
- Convoy components and inter-component boundary gaps.
- Current leader and front/behind relationships.
- Separation, overtaking and regroup notifications.
- Voice interaction state.
- Regroup recommendation evidence and approval.

Mobile prioritizes the route, the current driver instruction and the safest next action. Detailed evidence moves into a sheet.

Trip summary shows the route story, separation and reconnection timeline, safety events, group statistics and shareable memories. Fixture or simulated values remain clearly labeled.

### 4.6 Community, profile and settings

Routes:

- `/app/community`
- `/app/profile`
- `/app/settings`
- `/app/settings/privacy`
- `/app/settings/notifications`

Community is a travel activity feed with destination and route context, comments, saves, reports and privacy-aware location sharing. Profile combines identity, interests, trip history, reviews, saved places and visibility controls.

Settings becomes an index of dedicated settings areas. Privacy explains who can see live, approximate, historical or no location. Notifications distinguish convoy-critical, planning, community and marketing channels.

### 4.7 Administration and partners

Routes:

- `/app/admin/moderation`
- `/app/partners`

Moderation is a dense operational queue with filters, evidence context, decisions and audit state. The partners page presents the platform model, privacy-safe aggregate insights and credible tourism, managed-group and fleet use cases. It must not invent customers, prices, partnerships or performance metrics.

### 4.8 Unknown routes

Unknown paths render a product-consistent not-found page with useful recovery links. They do not silently redirect.

## 5. Shared interface units

### `AppShell`

Owns responsive navigation, account access, route-aware context, skip links and mobile navigation. It does not own route data.

### `PageHeader`

Presents product-scale page identity, optional status, supporting context and one primary action.

### Portable content objects

- `TripPreview`
- `PlacePreview`
- `ReviewRow`
- `MemberNode`

Each object has a clear semantic structure, relevant state and a single primary navigation or selection behavior.

### `MapWorkspace`

Owns provider rendering, attribution, loading, unavailable and fixture-fallback states. Tasco data remains identified as Tasco data. It does not calculate community ratings or convoy intelligence.

### `RouteTimeline`

Presents route progression across planning, itinerary, overview and summary while allowing each route to supply its own actions.

### `StatusNotice`

Provides consistent loading, stale, degraded, permission, empty, offline and error states.

### `Inspector` and `MobileSheet`

Render the same contextual model as a desktop side region or accessible mobile sheet.

## 6. Data and truthfulness rules

- Shared contract types win over duplicate route-local types.
- Tasco route and place facts remain separate from Loopin community reviews.
- Missing, stale or low-confidence data is never displayed as current.
- Location visibility is explicit on community, profile, sharing and live pages.
- Live GPS states include fresh, delayed, low-confidence, unavailable and reconnecting.
- Every primary action has an explicit loading, success, disabled or error state.
- Fixture contracts remain the source until service integration; redesign work does not invent incompatible models.
- Demo routes remain supported while dynamic `/app/...` routes are the primary product experience.

## 7. Code organization

The current monolithic route files will be split by responsibility:

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   └── shell/
├── auth/
├── dashboard/
├── trips/
├── explore/
├── places/
├── community/
├── profile/
├── settings/
├── moderation/
├── partners/
├── live-trip/
├── trip-summary/
├── shared/
│   ├── maps/
│   ├── status/
│   └── ui/
└── styles/
    ├── tokens.css
    ├── shell.css
    └── motion.css
```

Route modules consume shared contracts and focused reusable units. Map rendering does not calculate gaps, community modules do not own Tasco facts and page shells do not fetch route data.

## 8. Accessibility and responsive requirements

- All routes retain a working skip link and logical landmark structure.
- Navigation exposes the current route programmatically.
- Keyboard order follows visual and task order.
- Sheets and dialogs own focus correctly and have explicit close controls.
- Controls meet a minimum comfortable touch target on mobile.
- Text and state colors meet WCAG AA contrast.
- Status is never communicated by color alone.
- No route has accidental horizontal overflow.
- Map content has a meaningful text summary and action alternative.
- Reduced motion preserves all information and controls.

## 9. Testing strategy

Behavior-affecting work follows test-driven development.

### Unit and route tests

- Route registration and deep links.
- Active navigation state.
- Loading, empty, stale, permission and error states.
- Tasco/community source separation.
- Location visibility explanations.
- Live freshness and confidence labels.
- Primary actions and route transitions.

### Rendered browser verification

- Desktop, tablet and mobile layouts.
- Authentication through trip planning and live/summary paths.
- Keyboard navigation and visible focus.
- Mobile sheets and navigation.
- Reduced-motion rendering.
- Landing-page visual regression, especially computed font family and weight.
- Accessibility checks and console-error audit.

### Required project verification

- Web lint and typecheck.
- Web unit tests.
- Web production build.
- Web end-to-end suite.
- Contract checks if shared contract consumers change.

## 10. Delivery constraints

- Do not redesign the public landing page.
- Correct landing typography only where loading or inheritance has regressed.
- Do not deploy AWS.
- Do not merge to `main`.
- Work on `codex/product-experience-redesign`.
- Preserve existing uncommitted auth-route link work and integrate it intentionally during implementation.
- Commit each coherent unit of work after focused verification.

## 11. Completion criteria

The redesign is complete when every non-landing web route uses the shared responsive system, remains correctly routed, exposes truthful data states, works at desktop and mobile sizes, meets the accessibility requirements above and passes the full verification suite. The landing page must retain its approved composition and render its intended typography consistently.
