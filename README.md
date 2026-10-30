# Usman Khan Portfolio — Production Website + CMS

> **Cloudflare version:** see `CLOUDFLARE-SETUP-HINDI.md` (D1 + KV via `_worker.js`). The Node instructions below apply only to the legacy `server.js`, which now serves files from `public/`.

Six-page personal portfolio with a password-protected Admin Panel and persistent JSON-based CMS.

## Stack

- Plain HTML/CSS/JavaScript frontend
- Node.js 18+ backend
- JSON content storage
- Server-side sessions with HTTP-only cookies
- scrypt password hashing
- Persistent image uploads in `assets/uploads/`
- No frontend framework or third-party runtime dependency

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run:

```bash
npm start
```

4. Open:

- Website: `http://localhost:8000/`
- Admin: `http://localhost:8000/admin`

Do not open the HTML files directly. The Node server injects CMS content and provides the Admin API.

## First login

Initial local credentials:

- Username: `admin`
- Password: `Admin@123`

**Change the password before publishing.** Use **Admin Settings** after login.

The password is stored as a salted scrypt hash in `data/admin.json`.

## CMS structure

The Admin Panel now manages the public content from a single persisted source.

### Global Settings

- Website name, global logo image, logo text and subtitle
- Logo upload / preview / replace / remove with text-logo fallback
- Positioning statement
- Profile image
- Header CTA
- Footer copy and footer social text
- Navigation items: add, edit, delete, reorder, hide/show, new-tab option
- Site title, browser title, favicon and default OG image

### Home

- Hero copy and CTAs
- Hero copy and CTAs
- Hero badges/labels
- Hero image overlay
- Repeatable statistics
- Service previews sourced directly from Services
- Featured work sourced directly from Portfolio
- All Home section headings/descriptions
- Brands and testimonial sections
- Final CTA

### Home → Brands & Collaborations

Unlimited/repeatable Home Page collection.

Each item supports:

- Name
- Logo/image
- Website URL
- Description
- Year
- Category
- Visibility
- Order

Actions: **Add, Edit, Delete, Duplicate, Reorder, Hide/Show, Upload/Replace**.

The Home marquee generates from this collection. Brands are entered once; the marquee duplicates them internally for looping.

### Home → Client Feedback / Testimonials

Unlimited/repeatable Home Page collection.

Each item supports:

- Client name
- Client photo
- Company
- Designation
- Testimonial text
- Rating
- Project/service
- Date
- Verified
- Featured
- Visibility
- Order

Actions: **Add, Edit, Delete, Duplicate, Reorder, Hide/Show, Upload/Replace**.

The Home slider is generated from the saved collection.

### Portfolio

Unlimited/repeatable projects. Portfolio categories are also managed from the Portfolio editor; no code changes are required to rename, add, reorder or hide filter categories.

Supports title, descriptions, category, thumbnail, gallery URLs, client, year, tools, project URL, CTA, badge, featured state, visibility and order.

Portfolio categories are generated from the projects currently stored in the CMS.

### Services

Unlimited/repeatable services.

Services are the shared source for:

- Home service previews
- Services page
- Contact project-type options
- Footer service links

Supports name, icon, image, descriptions, price, price suffix, features, CTA, CTA URL, Home badge, Home CTA and visibility/order.

### Awards & Achievements

Unlimited/repeatable achievements with year, organization, description, image/certificate, icon, category, featured state, visibility and order.

### About

Editable hero copy, story, story labels, mission, differentiator, career journey, repeatable timeline, repeatable skills, skill percentages/descriptions, repeatable focus cards and CTA.

### Contact

Centralized:

- Email
- Phone
- WhatsApp
- Website
- Email subject/message defaults
- WhatsApp template
- Unlimited social profiles
- Contact form labels
- Placeholders
- Required/optional state
- Success/error messages
- Budget options
- Visitor-journey labels

### SEO

Each public page has editable:

- Page title
- Meta description
- Open Graph title
- Open Graph description
- OG image
- Canonical URL

## WhatsApp form

The Contact form validates the configured required fields, builds a message containing:

- Name
- Email
- Project Type
- Budget
- Message

It then opens WhatsApp using the centrally configured number and resets the form after the WhatsApp action is initiated.

If WhatsApp is not configured, the form shows the configured error message instead of pretending that a message was sent.

## Media

Supported uploads:

- PNG
- JPEG
- WebP

The Admin Panel optimizes uploaded images as WebP and limits the optimized image to 7 MB. Source uploads are limited to 15 MB and oversized dimensions are reduced to a maximum side of 1800 px.

Uploaded files are stored in `assets/uploads/`.

## Data and backup

| Path | Purpose |
|---|---|
| `data/content.json` | Current saved CMS content |
| `data/seed-content.json` | Clean initial content |
| `data/admin.json` | Admin username + password hash |
| `assets/uploads/` | Uploaded media |

Back up **both `data/` and `assets/uploads/`** before deployments or migrations.

## Deployment

This project requires a Node-capable host with persistent filesystem storage.

Start command:

```bash
npm start
```

The server respects the hosting provider's `PORT` environment variable and listens on `0.0.0.0`.

Optional first-run environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_HOURS`

For Docker:

```bash
docker build -t usman-khan-portfolio .
docker run -p 8000:8000 \
  -v usman_site_data:/app/data \
  -v usman_site_uploads:/app/assets/uploads \
  usman-khan-portfolio
```

Use HTTPS in production.

## Project structure

```text
usman-khan-portfolio/
├── index.html
├── portfolio.html
├── about.html
├── services.html
├── achievements.html
├── contact.html
├── admin/
├── assets/
│   ├── css/
│   ├── js/
│   ├── fonts/
│   ├── images/
│   ├── projects/
│   └── uploads/
├── data/
├── server.js
├── package.json
├── Dockerfile
├── QA-REPORT.md
└── README.md
```

## Publishing checklist

Before going live:

1. Start the Node server on the production host.
2. Log into `/admin`.
3. Change the default Admin password.
4. Add the real profile image.
5. Add real brands/collaborations.
6. Add verified testimonials if available.
7. Review portfolio projects and service details.
8. Enter the real WhatsApp number.
9. Enter the real email, website and social URLs.
10. Replace the favicon if a different one is required.
11. Review SEO fields for all six pages.
12. Save and refresh the public pages.
13. Submit a test Contact form and confirm the WhatsApp message contains the expected fields.
14. Back up `data/` and `assets/uploads/`.

The public website does not require source-code edits for normal content changes.
