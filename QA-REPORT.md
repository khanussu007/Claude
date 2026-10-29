# Final Pre-Publish QA Report

**Project:** Usman Khan Portfolio + CMS Admin Panel  
**Test date:** 27 October 2026

## Result

**Production CMS/API/static smoke tests: PASS**

The existing project was audited and targeted changes were made without replacing the framework or redesigning the public site.

## What was implemented
## Targeted final fixes in this pass

- Kept the **global Logo** editor under **Global Settings** using the existing media/CMS system.
- The selected logo now renders dynamically in the public header and footer, with the existing text logo retained as the fallback when no image is selected.
- Kept **Client Feedback / Testimonials** and **Brands & Collaborations** inside the **Home Page** editor; no standalone top-level collection routes are used.
- Kept both collections repeatable and connected to the existing Home slider/marquee.
- Removed the hard-coded Portfolio filter buttons/counts from the HTML. Filter buttons and counts are now generated from the current enabled CMS projects.
- Fixed the existing class mismatch between the portfolio filter renderer and its CSS so the existing filter styling applies consistently.
- Added responsive wrapping/overflow protection for the filter controls without changing the portfolio filtering behavior.


### Repeatable CMS collections

- Brands & Collaborations — unlimited
- Testimonials — unlimited
- Portfolio projects — unlimited
- Services — unlimited
- Awards & Achievements — unlimited
- About timeline — repeatable
- About skills — repeatable
- About focus cards — repeatable
- Home statistics — repeatable
- Social profiles — repeatable
- Navigation items — repeatable
- Hero badges — repeatable

Repeatable editor controls include add, edit, delete, duplicate, reorder and visibility where applicable.

### Centralized content

- Website identity
- Header CTA
- Footer copy
- Email
- Phone
- WhatsApp
- Website URL
- Social profiles
- Favicon
- Default OG image
- SEO metadata
- Contact form configuration

### Public-site connections

CMS data is rendered into the existing public pages rather than being stored only as unused Admin fields.

Examples verified through the source and API implementation:

- Services are shared between Home, Services and Contact.
- Featured work is sourced from Portfolio.
- Brands generate the Home marquee.
- Testimonials generate the Home slider.
- Social profiles generate footer/contact social links.
- Navigation items generate the public navigation.
- Contact data generates email, website and WhatsApp destinations.
- SEO data updates document metadata.
- Favicon is served from the CMS-controlled identity setting.

## Automated/static verification

| Check | Result |
|---|---:|
| Node syntax check — server | PASS |
| Node syntax check — Admin JS | PASS |
| Node syntax check — public JS | PASS |
| Public route smoke test | PASS |
| Admin login route protection | PASS |
| Admin API authentication | PASS |
| CMS save persistence | PASS |
| Brands add/edit/reorder/delete test | PASS |
| Testimonials add/edit/delete test | PASS |
| CMS refresh persistence test | PASS |
| Image upload API | PASS |
| Image deletion API | PASS |
| Local HTML asset existence scan | PASS |
| Favicon HTTP delivery | PASS |
| Public CSS/JS delivery | PASS |
| Duplicate fixed collection-limit scan | PASS |
| Placeholder brand/testimonial source scan | PASS |
| Hard-coded placeholder social URL scan | PASS |

## CMS CRUD test

A temporary test fixture was used through the protected Admin API:

1. Added two Brands.
2. Edited one Brand.
3. Reordered the Brands.
4. Added two Testimonials.
5. Deleted one Testimonial.
6. Saved the complete content object.
7. Read the public content endpoint.
8. Verified the edited/reordered/deleted state.
9. Read the public content again to verify persistence.
10. Restored the clean production content.

**Result: PASS.**

## Media test

A temporary PNG was uploaded through `/api/admin/upload`, confirmed as an uploaded asset, then removed through `/api/admin/delete-upload`.

**Result: PASS.**

## Security smoke checks

- Admin API requires authentication.
- Admin page redirects anonymous visitors to login.
- Write requests require the expected AJAX header.
- Passwords use salted scrypt hashes.
- Admin credentials are not exposed through public content.
- Session cookies are HTTP-only and SameSite-protected.
- Login attempts are rate-limited.
- Uploaded-file deletion is restricted to the upload directory.

## Public-page route check

The following returned HTTP 200 from the Node server:

- `/`
- `/index.html`
- `/portfolio.html`
- `/about.html`
- `/services.html`
- `/achievements.html`
- `/contact.html`
- `/assets/css/style.css`
- `/assets/js/site.js`
- `/assets/images/favicon.svg`

## Important limitation

A real browser automation engine was not available in the execution environment used for this final pass. Therefore I **did not claim a Chromium/browser-console, screenshot, or physical mobile/tablet interaction test**.

The final pass instead used:

- Node syntax checks
- HTTP route tests
- Protected API tests
- CMS CRUD/persistence tests
- Upload/delete tests
- HTML parsing
- local asset-reference scanning
- source-code hard-coded-content scans

Before public launch, perform one quick manual browser pass on desktop and mobile, especially:

- Admin add/edit/delete/reorder controls
- Testimonial slider
- Brand marquee
- Contact WhatsApp form
- Image uploads
- Favicon refresh
- Mobile navigation

## Final content state

Temporary QA Brands, Testimonials and uploaded test media were removed. The delivery contains an empty Brands collection and an empty Testimonials collection so no fabricated client or collaboration claims are presented publicly.

The existing portfolio/service/achievement content remains intact.

## Publish blocker

**Change the initial Admin password before launch.**

After that, the project is ready for deployment from a CMS/data perspective, subject to the host providing a persistent Node.js filesystem and HTTPS.

## Targeted integration test — final pass

The protected Admin API was used with temporary QA records and then restored to the original production content.

- Logo image save → public content → restore: **PASS**
- Testimonial add → public content → delete/restore: **PASS**
- Brand add → public content → delete/restore: **PASS**
- Existing portfolio project count: **9**
- Portfolio category counts are calculated from the enabled CMS project array at render time.

No temporary QA records remain in the final content.

## Additional final-pass verification

- Global logo SVG upload → save → public content → remove → text fallback: PASS
- Home testimonial/brand ordering uses persisted `order` values: PASS
- Portfolio category collection is CMS-managed and included in protected saves: PASS
- Portfolio filter labels and counts are generated from CMS categories/projects: PASS
- Home hero experience is linked to a selectable CMS statistic: PASS
- Home service/work CTA text and destinations are CMS-controlled: PASS
- About/Services/Achievements/Portfolio/Contact hero tags are CMS-controlled: PASS
- Contact card labels/descriptions and hero CTA labels/destinations are CMS-controlled: PASS
- Social profile icons render according to the selected platform/icon: PASS
- Content persisted after server restart: PASS

Browser automation/visual console inspection was not available in the execution environment, so no Chromium console result is claimed. Public routes, static assets, API behavior and JavaScript syntax were tested directly.

## Final cross-page consistency pass — 2026-10-27

Reviewed the public Home, Portfolio, About, Services, Awards & Achievements, and Contact pages plus the Admin Panel source and responsive CSS.

Targeted fixes applied without changing the existing component structure or CMS behavior:

- Kept the Premium Navy & Gold theme as the single active public theme.
- Normalized remaining page-specific heading/role/tag colors to the same navy/gold palette.
- Removed remaining light-theme visual mismatches caused by dark-only fallback colors in image placeholders, select options, timeline/achievement markers and interactive states.
- Corrected the Portfolio filter layout at mobile widths so filters use a real two-column grid, with a one-column fallback on very narrow screens instead of relying on ineffective grid properties on a flex container.
- Updated public browser theme-color metadata from the old dark fallback to the active navy brand color.
- Preserved the existing Manrope/Sora typography, spacing scale, animation timing, navigation, page structure and Admin Panel behavior.

Validation after the pass:

- Node syntax checks: PASS
- HTML parsing: PASS
- Public routes `/`, `/portfolio.html`, `/about.html`, `/services.html`, `/achievements.html`, `/contact.html`: HTTP 200
- Admin route protection: PASS (unauthenticated `/admin/` redirects to login)
- Public theme metadata: PASS
- Existing CMS/API architecture: unchanged

Browser automation screenshots were not available in this runtime, so visual validation was performed from the source/CSS structure and responsive breakpoints rather than being reported as a Chromium screenshot test.
