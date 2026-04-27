# Spain & Italy 2026 — Trip Planner

React + Vite web app with Supabase backend for real-time trip planning between two users.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Supabase Setup

### 1. Create the `selections` table

Run this SQL in your Supabase SQL Editor (**SQL Editor > New Query**):

```sql
-- Selections table for storing item statuses
CREATE TABLE selections (
  item_id TEXT PRIMARY KEY,
  status TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (both trip partners)
CREATE POLICY "Authenticated users can read selections"
  ON selections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert selections"
  ON selections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update selections"
  ON selections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete selections"
  ON selections FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime for the selections table
ALTER PUBLICATION supabase_realtime ADD TABLE selections;
```

### 2. Create the Storage bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it `reservations`
4. Set it to **Public** (so both users can view uploaded files)
5. Click **Create bucket**
6. Go to the bucket's **Policies** tab and add these policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reservations');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'reservations');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'reservations');
```

### 3. Enable Email Auth

1. Go to **Authentication > Providers**
2. Ensure **Email** provider is enabled
3. Create two user accounts (one for you, one for your girlfriend) via **Authentication > Users > Add user**

### 4. Enable Realtime

1. Go to **Database > Replication**
2. Ensure the `selections` table has replication enabled (the SQL above does this, but verify it shows as enabled)

## Local Development

```bash
# Clone and install
cd trip-planner-app
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key from:
# Supabase Dashboard > Settings > API

# Run dev server
npm run dev
```

## Environment Variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon/public key |

## Deploy to Vercel

### Option A: Via Vercel CLI

```bash
npm i -g vercel
vercel

# When prompted:
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist
```

Then add environment variables:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

### Option B: Via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Framework Preset: **Vite**
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**

### After deploying

Add your Vercel URL to Supabase allowed redirect URLs:
1. Go to **Authentication > URL Configuration**
2. Add `https://your-app.vercel.app` to **Redirect URLs**

## How it works

- Both users sign in with their email/password
- Selecting/confirming items syncs instantly via Supabase Realtime
- File uploads (reservations, confirmations) go to Supabase Storage
- All trip data, styling, timeline, filters, and Google Maps are preserved from the original HTML version
