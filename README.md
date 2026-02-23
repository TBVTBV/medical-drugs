# MedTrack - Medical Drugs Distribution System

A web application to manage and track the assignment of Actiq (Fentanyl lollipops) and miscellaneous medical drugs to soldiers within a military unit.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts
- **Signature**: react-signature-canvas
- **CSV**: PapaParse

## Features

- Google SSO authentication with role-based access (Admin, Temp Admin, General)
- User management with CSV import/export
- Drug inventory tracking (Actiq shipments + other drugs)
- Drug assignment with digital signature capture
- Status updates (Administered, Lost/Damaged, Returned with signature)
- Dashboard with pie charts and role-based filtering
- Immutable audit log with CSV export
- Dark/Light theme support
- Mobile-first responsive design

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` via the Supabase SQL Editor
3. Enable Google Auth in Authentication > Providers > Google
4. Create a storage bucket named `signatures` (done by the schema SQL)

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first user to sign in via Google SSO automatically becomes an Admin.

## Project Structure

```
src/
  app/
    (app)/                  # Authenticated app routes
      dashboard/            # Main dashboard with charts & assignment table
      management/           # Users, Drug Management, Settings tabs
      log/                  # Assignment audit log
    auth/callback/          # Google SSO callback
    login/                  # Login page
  components/               # Shared UI components
  contexts/                 # Auth and Theme context providers
  lib/
    supabase/               # Supabase client utilities
    types.ts                # TypeScript type definitions
supabase/
  schema.sql                # Database schema (tables, RLS, triggers)
```

## Database Schema

- **users** - All military personnel (admins and soldiers)
- **inventory_batches** - Incoming drug shipments
- **active_assignments** - Current real-time drug holdings per soldier
- **action_logs** - Immutable audit trail of all actions
