# C5 — Make the `reservations` bucket private

**Status: PROPOSED — apply via the Supabase dashboard.** The app code is already
updated (Slice 3): `src/services/storage.js` now issues time-limited **signed
URLs** (`createSignedUrl` / `createSignedUrls`, 24h TTL) instead of permanent
public URLs. Signed URLs work whether the bucket is public or private, so the
code change is safe to ship first. This step closes the hole by removing public
access.

## Why

Receipts/reservation docs are personal data. With `getPublicUrl` on a **public**
bucket and a guessable path (`<itemId>/<timestamp>`), anyone with (or guessing)
the URL could read them unauthenticated. Private bucket + signed URLs fixes that.

## Steps (Supabase dashboard)

1. **Storage → `reservations` bucket → Settings → turn OFF "Public bucket".**
   After this, old `getPublicUrl` links stop working — but the app no longer
   uses them.

2. **Add RLS policies** so authenticated users can read/write (and generate
   signed URLs). This app treats all signed-in users as trusted, so the policies
   are permissive for the `authenticated` role, scoped to this bucket. Run in the
   SQL editor:

   ```sql
   -- Read (required so createSignedUrl works for signed-in users)
   create policy "reservations read (authenticated)"
     on storage.objects for select to authenticated
     using (bucket_id = 'reservations');

   -- Upload
   create policy "reservations insert (authenticated)"
     on storage.objects for insert to authenticated
     with check (bucket_id = 'reservations');

   -- Overwrite (upsert) / delete
   create policy "reservations update (authenticated)"
     on storage.objects for update to authenticated
     using (bucket_id = 'reservations');
   create policy "reservations delete (authenticated)"
     on storage.objects for delete to authenticated
     using (bucket_id = 'reservations');
   ```

3. **Smoketest in the app:** confirm an item's receipt still opens (signed URL),
   uploads work, and an incognito guess of an old public-style URL now 401/403s.

## Notes

- Signed-URL TTL is `SIGNED_URL_TTL` in `src/services/storage.js` (24h). Links
  regenerate whenever files are listed (DetailModal open / status change).
- Tightening later (per-user ownership paths) would need a folder/owner
  convention; out of scope for this fix.
