# Plannr — Events, RSVPs, and QR Check-In (Next.js + Prisma)

A full-stack event platform where **organizers** can create/manage events (with cover images), and **members** can discover events, RSVP (including waitlist flows), and check in via **QR codes**. Built with the Next.js App Router, Prisma, and PostgreSQL—ready for local dev and Vercel deployment.

> Rename “Plannr” to your actual project name if different.

---

## Table of Contents
- [Demo](#demo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup (Prisma)](#database-setup-prisma)
- [Running Locally](#running-locally)
- [Deployment (Vercel)](#deployment-vercel)
- [API Routes](#api-routes)
- [Project Structure](#project-structure)
- [License](#license)

---

## Demo
- **Live**: https://plannr-qzjyzxf88-kenny-shaos-projects.vercel.app/
- **Local**: `http://localhost:3000`

---

## Key Features

### Public Experience
- Browse a **public event feed** with filters + pagination
- View event details (time/location/description/cover art)
- RSVP with clear status: **Going / Maybe / Declined**
- Shareable public links (copy/open share link)
- Google Calendar-friendly event link (optional)

### Organizer Experience
- Organizer dashboard for:
  - Creating events
  - Editing events (including **cover image upload + preview**)
  - Deleting events
  - Viewing attendee/RSVP lists
- Check-in flow:
  - QR code generated per event
  - Secure check-in pages (optionally using a secret token)

### RSVP + Attendance Logic
- Store RSVP status plus an **attendance state** (e.g., `CONFIRMED` / `WAITLISTED`)
- (Optional) Automated emails:
  - RSVP updated
  - Waitlist promoted

### Media / Images
- Event cover images supported (organizer-controlled)
- Fallback images (category-based) for events without a cover (optional)
- Next.js `<Image />` optimized rendering

---

## Tech Stack

**Frontend**
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Next/Image for optimized images

**Backend**
- Next.js Route Handlers (`/app/api/...`)
- Prisma ORM
- PostgreSQL

**Auth**
- Auth.js / NextAuth (session-based auth)
- Role-based access (e.g., `ORGANIZER`, `MEMBER`)

**Email (optional)**
- Provider-based (SMTP / Resend / etc.)
- Transactional templates for RSVP and waitlist events

**Deployment**
- Vercel (recommended)
- Postgres provider (Neon / Supabase / RDS / etc.)

---

## Architecture Overview

- **Next.js App Router** handles both UI and server logic.
- **Prisma** provides typed database access and migrations.
- **PostgreSQL** stores:
  - Users + roles
  - Events (including image URL)
  - RSVPs (status + attendance state)
- **Route Handlers** implement API endpoints:
  - RSVP updates
  - Event CRUD
  - QR generation
  - Check-in logic
- **UI Components**:
  - Event cards, filters, pagination
  - RSVP buttons + status display
  - Organizer forms with cover preview/upload

---

## Getting Started
Prerequisites

Node.js 18+ (Node 20+ recommended)

Package manager: pnpm (recommended) or npm/yarn

PostgreSQL database (local Docker or hosted)

(Optional) Email provider credentials if enabling emails

---

## Database Setup (Prisma)

# Install dependencies:

pnpm install
or: npm install


# Generate Prisma client:

pnpm prisma generate


# Run migrations:

pnpm prisma migrate dev


# (Optional) Seed:

pnpm prisma db seed


# Open Prisma Studio:

pnpm prisma studio

# Running Locally
pnpm dev
or: npm run dev


# Then open:

http://localhost:3000

---

## Deployment (Vercel)

1. Push your repo to GitHub

2. Import into Vercel

3. Add environment variables in Vercel → Project → Settings → Environment Variables

- DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, APP_BASE_URL, etc.

- Ensure Prisma migrations run on deploy. Common approach:

- Add to build pipeline or use a postinstall/build step:

prisma generate

prisma migrate deploy

Example package.json (conceptual):

{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}

---

## Usage Guide
# Organizer Flow

1. Sign in as an Organizer

2. Create an event:
    - Title, description, time, location, category
    - Upload/select a cover image (preview should update immediately)

3. Publish/save
    - Share the event publicly (copy link)

4. At event time:
   - Open the organizer check-in page
   - Use QR codes to check in attendees

# Member Flow

1. Browse events on the public feed

2. Open an event detail

3. RSVP: Going / Maybe / Declined
   - (Optional) Receive email confirmation + updates

4. Show QR/check-in at the event if required

---

## API Routes

Typical routes in this project:

GET /api/qr?text=...

- Returns a QR image for the provided text/URL

POST /api/events/[slug]/rsvp

- Updates RSVP status; may update attendance state

- May send emails on change

DELETE /api/events/[slug]

- Organizer delete event

POST /api/events

- Organizer create event

PATCH /api/events/[slug]

- Organizer edit event

POST /api/events/[slug]/checkin

- Marks attendee as checked in (often protected)

---

## License

No license currently
