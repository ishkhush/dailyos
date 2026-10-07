# Your Daily OS: a two-minute guide

Your iPhone app is an installed copy of the website. Think of your phone and laptop as two notebooks, with Supabase holding a shared master notebook online.

**When you tick a habit:**
1. Your phone saves the tick immediately in its own notebook.
2. When online and signed in, it sends that change to your private Supabase account.
3. Supabase tells your laptop something changed. The laptop fetches it and shows the tick.

Normally this takes moments. If a device is offline, it keeps a to-do list of changes and sends them when it reconnects. A check every 15 seconds catches missed notices. If both devices change the same thing, the newer edit wins; keep their clocks set automatically.

**Where your photos live:**
The app saves a resized JPEG on the phone, then sends it to private file storage at Supabase. A separate entry records its date and file location. Your laptop signs in, reads that entry, and fetches the photo using your account permission. Both devices keep offline copies. The gallery uses small previews; opening a photo shows the larger saved JPEG. Your original camera-roll photo stays wherever you originally kept it. Old cloud versions are retained for recovery and still count toward storage.

**Keep it working:**
- Keep access to **GitHub** (hosts the website), **Supabase** (login, shared records and photos), and your login email/password. Save account recovery codes privately. The iPhone and laptop must use the same Daily OS account and website address.
- GitHub Pages has a free option. Supabase Free includes **500 MB for records, 1 GB for files/photos, and 5 GB transfer plus 5 GB cached transfer**. Free projects can pause after a week of inactivity. Pro starts at **$25/month**, including 100 GB files and seven days of daily database backups. Check **Supabase → Usage** monthly, especially Storage and transfer; investigate or upgrade before you approach the limits. See [current pricing](https://supabase.com/pricing) and [storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).
- Food AI and optional paid voices use separate provider accounts and may charge per use. Normal habit/photo sync does not depend on those optional services.
- Wait for **Synced**, then use **Backup → Back up now** weekly and before major changes. Save the downloaded file somewhere separate, such as iCloud Drive, and keep several dated copies. It includes local records and photos, but excludes passwords and private AI keys. The app prompts/downloads when opened after seven days; it does not run backups while closed. For automatic server database backups, use Supabase Pro. **Database backups do not include photo file contents**, so keep the app exports as well. [Backup details](https://supabase.com/docs/guides/platform/backups).
- On a new phone, open the same website, install it, and sign in to the same account. Allow photos to finish downloading. If cloud recovery fails, sign in and import your saved backup; the confirmation explains that matching records will be replaced and synced. Recover forgotten account access through your Supabase dashboard. Do not clear or uninstall the old app before its waiting changes are synced and backed up.
- Missing internet, expired login, a paused project, a full storage allowance, or changing the website/project address can interrupt sync. Watch the account status for **Offline**, waiting changes, or **Sync needs attention**.

**If something stops working, check these three things first:**
1. Are both devices online and signed in to the same account? Open Daily OS on each.
2. Does the status say **Synced**? Open **Account & sync → Retry sync**; note any error.
3. Is your Supabase project active and below its Usage limits? Check its dashboard. Keep backups and waiting changes; do not clear app storage as a troubleshooting step.
