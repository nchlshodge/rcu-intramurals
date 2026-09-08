# Setting up push notifications

This wires up real Web Push notifications (new announcements, schedule
changes, new devotional plans) that arrive even when the site isn't open —
no native app, no App Store, just the browser's own Push API. Everything on
the client side (`index.html`, `sw.js`) and the Cloud Functions that send the
pushes (`functions/`) is already written. The steps below are the ones only
you can do, since they need your own Firebase/Google account.

## 1. Upgrade the `rcu-intramurals` project to the Blaze plan

Cloud Functions requires the Blaze (pay-as-you-go) plan — Blaze has no
monthly fee by itself, you're only billed for usage beyond its free tier
(2M function invocations/month, among other quotas), which this app's scale
won't come close to. See the budget alert step below to guard against
surprises.

1. Open [Usage and billing](https://console.firebase.google.com/project/rcu-intramurals/usage/details) in the Firebase console.
2. Click **Modify plan** → **Blaze**.
3. Attach a billing account (create one if you don't have one yet — this is
   where you enter a card; that part has to happen in Google's own console,
   not here).

## 2. Set a budget alert

This is what keeps "pay-as-you-go" from being a blank check.

1. Go to [Google Cloud Billing → Budgets & alerts](https://console.cloud.google.com/billing/budgets) for the billing account you just attached.
2. **Create budget** → scope it to the `rcu-intramurals` project.
3. Set a monthly amount — **$5/month** is plenty of headroom for this app's
   expected usage (effectively $0) while still catching anything unexpected
   early. Adjust if you'd rather a different number.
4. Leave the default alert thresholds (50%/90%/100% of budget) — you'll get
   an email if usage ever approaches that, well before it becomes a real
   charge.

This only *alerts*, it doesn't auto-stop billing — for this app's size, that
tradeoff is fine (an actual overage would mean something is broken, worth an
email either way).

## 3. The VAPID keys (already generated)

No Firebase Cloud Messaging or service account needed — this is browser-only
Web Push via VAPID keys, which are already generated:
- The **public** key is already embedded in `index.html` as `VAPID_PUBLIC_KEY`
  — fine to be public, already committed.
- The **private** key is `ZiZYGP3CsE-ctlU8S0pk3xr8lC61i2GO_PfWYRv4M3U` — set it
  as a Cloud Functions secret in step 5 below, **never commit it to the repo**.

## 4. Set the Cloud Functions secrets

From this project's root folder:

```bash
firebase functions:secrets:set VAPID_PUBLIC_KEY --project rcu-intramurals
```
When prompted, paste: `BH7WloViGG_nUWOyY4WjOQ-u9XQfXnwgtDnKzymutIQxO_T_6jYiL9X3SykOXU26FNI0OTkXzQskwx4vAbW22cM`

```bash
firebase functions:secrets:set VAPID_PRIVATE_KEY --project rcu-intramurals
```
When prompted, paste: `ZiZYGP3CsE-ctlU8S0pk3xr8lC61i2GO_PfWYRv4M3U`

## 5. Deploy

```bash
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules --project rcu-intramurals
```

This deploys three functions — `sendPushOnAnnouncement`,
`sendPushOnMatchupChange`, `sendPushOnDevotionalChange` — each a Firestore
trigger that fires on the relevant document write, plus the updated
`firestore.rules` (adds the `pushSubscriptions` collection these functions
read from).

## 6. Test it

1. On the live site, on the Home tab, find the **Stay in the loop** card and
   tap **Enable notifications** — grant the permission prompt. (On iOS,
   Safari only supports this after the page has been added to the Home
   Screen — the card will tell you that if it detects it.)
2. As a coordinator, post an announcement, change a matchup's date/time/
   location, or point the Devotional tab at a new plan.
3. You should get a real OS-level notification, even with the site's tab or
   app fully closed.

If nothing arrives, check **Firebase console → Functions → Logs** for the
function that should have fired (e.g. `sendPushOnAnnouncement`) to see
whether it ran and what it logged.

## How it decides what counts as "changed"

Each function compares the Firestore document's state before vs. after the
write, so routine re-saves of unchanged values don't spam a notification:
- **Announcement** — fires when `text` becomes non-empty and is different
  from what it was (clearing the announcement doesn't notify).
- **Matchup** — fires when `date`, `time`, or `location` differs from before
  (assigning a matchup's first date counts as a change).
- **Devotional plan** — fires when `baseUrl` changes (i.e. an actually new
  reading plan, not editing day titles/verses within the same plan).
