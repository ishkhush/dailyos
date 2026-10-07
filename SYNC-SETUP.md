# Daily OS: phone and laptop setup

Website: https://ishkhush.github.io/dailyos/

The website and installed iPhone PWA are the same app. The laptop gets a sidebar and wider layouts. Login is required to display personal data and for all cloud reads and writes; offline copies remain stored privately on your device. See [the two-minute guide](./DAILYOS-GUIDE.md) and [security review](./SECURITY-REVIEW.md).

## One-time setup

1. On your iPhone, open your existing installed Daily OS app. Use **Backup and restore → Back up now** and save the JSON file before starting. Do not clear Safari storage, uninstall the PWA, or switch to another website origin: your existing data lives in that app's storage.
2. Create a free project at https://supabase.com/dashboard. Save its database password somewhere private. You do not need to install anything.
3. Open **SQL Editor → New query**. Paste the entire contents of [supabase-setup.sql](./supabase-setup.sql) and click **Run**. It creates the sync table, private photo bucket, conflict-resolution functions, and security policies, and enables live updates.
4. Under **Authentication → URL Configuration**, set the Site URL to `https://ishkhush.github.io/dailyos/` and add that exact URL to the redirect allowlist. Under **Authentication → Providers**, enable email/password login. Leave email confirmation enabled. Supabase's built-in mail sender has limits; for this personal setup you can alternatively create your single confirmed user directly under **Authentication → Users → Add user**.
5. Under the project connection/API settings, copy the **Project URL** and **publishable key** (or the legacy **anon** key). These browser keys are public; row security protects the data. Never use the secret or service-role key in the app.
6. Create your one confirmed account under **Supabase → Authentication → Users → Add user**, unless it already exists. **On the iPhone first**, use the sign-in sheet and your existing email/password. The shared project URL/public key are prefilled. Wait until the status says **Synced** with no queued changes; photos can take longer to upload. If it says **Sync needs attention**, inspect its error and tap **Retry sync**.
7. Disable **Allow new users to sign up** under Supabase Authentication settings. Run [supabase-security-hardening.sql](./supabase-security-hardening.sql) after setup; if multiple accounts exist, set its owner_override to your account UUID. Then run [supabase-security-check.sql](./supabase-security-check.sql). These rules restrict access to your one account and do not delete records or photos.
8. On your laptop, open https://ishkhush.github.io/dailyos/ in a browser. Use the sync status → Backend settings to enter the **same project URL/key**, then sign in with the **same email/password**. Your phone's cloud data replaces the laptop's starter defaults. A separate Anthropic key is optional for food AI and is entered under **Account & sync → Connect food AI on this device**; it never syncs.
9. Test by adding a habit on the phone, changing its selected-day time on the laptop, and checking it off on either device. Leave both apps open; changes should appear in seconds. Then take one device offline, edit a different habit, reconnect, and check both devices agree.

The repository contains only the supplied public project URL/publishable key. Administrator settings and owner/other-user verification require dashboard access. Anonymous live record reads were denied; live signup was enabled at the time of review.

If confirming an email opens a browser automatically, an empty account waits at **Choose migration source**. Return to the installed iPhone app containing your data, open Account & sync, and tap **Upload this device’s existing data**. This prevents an email-confirmation browser from automatically seeding the account with starter data.

## How sync behaves

- Writes save locally immediately. Once signed in, their durable queue survives closing the app, lost network access, and expired sessions. Keep the app open after reconnecting so it can upload. The status shows waiting changes and errors.
- Live database notifications trigger a merge. Foreground/reconnect refreshes and a 15-second catch-up poll recover missed notifications. No manual page refresh is needed.
- Lists with item IDs sync separate items and fields; date-specific marks, time slots, and hidden habits have separate entries. Habit records and complete start/end time slots merge atomically, so concurrent valid time edits cannot combine into an invalid interval. Concurrent edits to the same record/field use the newer timestamp, with a device ID tie-breaker. Keep device clocks set automatically. Concurrent reorder operations use the latest order; new IDs missing from that order are appended. Lists without stable item IDs (legacy data, bodyweight logs) merge as one list.
- Deletions are durable tombstones. Deleting for today hides only that selected date; deleting for all days removes the recurring template and its stored instances, overrides, and marks. Intentional later edits to a deleted item can restore it under latest-edit-wins behavior.
- Water history now lives in `dos_water_v2`, migrated from `dos_water_v1`. XP is reconstructed from the merged completion records and cached in `dos_xp_v1`; totals, levels, and awards therefore agree on every device without competing XP counters. Values live in `dailyos-xp.js`.
- Existing `dos_*` app data is seeded atomically only when the account is empty. Sign in on the iPhone first. Later new devices adopt the shared account. An additional pre-sync local data snapshot is retained in `dos_sync_snapshot_v1`; original photos are retained in IndexedDB `dailyos-before-sync`. Your downloaded JSON backup remains the simplest recovery path.
- Progress JPEGs upload to a **private** bucket. Only your account can read their records/files. Photo deletion removes the active reference; older uploaded versions remain private recovery files in storage. They are not publicly accessible. You can remove unused versions in Supabase Storage if needed.
- API keys, rate-limit bookkeeping, backup metadata, sync credentials/session data, and derived XP counters are excluded from replication. API keys and account/session internals are excluded from backups too.
- A browser with cached data is intended for your own devices. Signing out disconnects cloud access and hides personal pages but retains offline data; use a separate browser profile for another account. The UI gate does not encrypt browser storage; protect your device with its passcode.

## Sound on iPhone

Short, quiet WAV cues are synthesized in code and played through an HTML audio element. On the first tap/key press the app requests `navigator.audioSession.type = "playback"` where supported and resumes an AudioContext. XP uses a gentle rising chime; level-up uses a longer three-note version. **Gentle sounds** is available in Account & sync and the theme settings. Reduced motion simplifies XP and level animations.

Media playback can bypass the silent switch, but Safari/iOS controls autoplay, interruptions, and mixing with other apps. A first user gesture is required; cues are suppressed in hidden tabs. A PWA cannot guarantee playback alongside music/podcasts without ducking or pausing on every iOS version. There is no looping silent audio track. Test with your iPhone's silent switch on and music playing; turn Gentle sounds off if your OS interrupts it.

## Deploying later edits

From the DailyOS folder run `bash deploy.sh`. It commits the app's assets, pushes GitHub Pages, and verifies the live files match. Open the same URL on laptop and iPhone. Local data is not cleared by deployment. To prefill the backend settings for both devices, put the public URL/key in `sync-config.js`, then deploy again; never commit secret or service-role keys.

References: [Supabase row security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime database changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Private storage](https://supabase.com/docs/guides/storage/security/access-control), [Browser audio sessions](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/audioSession).
