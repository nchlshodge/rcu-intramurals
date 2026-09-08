# RCU Intramurals

A single-page intramural sports app for RCU Campus Recreation — sign-ups, team
rosters, auto-generated schedule & standings, a coordinator admin panel, a
daily Bible App reading, and the program's coordinator handbook.

**Live site:** https://nchlshodge.github.io/rcu-intramurals/

The app itself is one self-contained file, **`index.html`** — no build step,
styling/markup/logic all inline, RCU shield / RCC logo / RCU Alumni
Association mark embedded as base64 images. It's hosted as a static site on
**GitHub Pages** and backed by a real **Firebase** project (`rcu-intramurals`)
for shared data — Cloud Firestore for the database, Firebase Authentication
(Google Sign-In) for telling coordinators apart from everyone else.

## Files

| File                  | Purpose                                                        |
|-----------------------|------------------------------------------------------------------|
| `index.html`          | The app itself (served at the site root by GitHub Pages)         |
| `firestore.rules`     | Security rules — who can read/write what (see below)              |
| `firebase.json`       | Points `firebase deploy` at `firestore.rules`                     |
| `.firebaserc`         | Pins the Firebase CLI to the `rcu-intramurals` project            |
| `rcu-shield.png`      | RCU shield mark (source asset, pulled from rcu.edu)               |
| `rcc-logo.png`        | RCC logo, full version                                            |
| `rcc-logo-plain.png`  | RCC logo, plain version — used in the footer credit               |

## Running it locally

No dependencies to install. From this folder:

```bash
python3 -m http.server 8743
```

Then open `http://localhost:8743/index.html`. This talks to the *real*
`rcu-intramurals` Firebase project (same as the live site) — `localhost` is
authorized for both Firestore and Google Sign-In by default, so sign-ups,
sign-in, and admin changes made locally are real and shared, not a
local-only sandbox.

## Architecture: GitHub Pages + Firebase

There's no server of any kind — GitHub Pages serves the static file, and the
Firebase Web SDK (loaded from `gstatic.com` in `index.html`) talks directly
to Firestore/Auth from the browser. The Firebase config (project ID, API
key, etc.) embedded in `index.html` is meant to be public — same as it would
be in any Firebase web app — it's just an identifier, not a secret.
Everything real is enforced server-side by `firestore.rules`.

### Deploying rule changes

If you edit `firestore.rules`, push the change live with:

```bash
firebase deploy --only firestore:rules --project rcu-intramurals
```

(Requires the Firebase CLI, `firebase login` as an account with access to
the project — currently `nchlshodge@gmail.com`.)

### Granting coordinator / commissioner access

There's no separate account system — access is entirely about which Google
email is signed in, checked three ways:

- **Coordinators** — anyone signed in with Google using an email on the
  **Coordinators** list (Admin tab → Access & invites, commissioner-only)
  sees the **Admin** tab and can save season dates, the devotional plan,
  the announcement, active sport, and game times.
- **Commissioners** — run the whole program. Same access as coordinators,
  plus they manage both the Coordinators and Commissioners lists themselves,
  fully self-service, right from the Access & invites card — adding or
  removing either kind of access is just editing a list and hitting Save,
  no redeploy needed.
- **Bootstrap fallback** — a short hardcoded list of emails in
  `firestore.rules` (`isBootstrapCommissioner()`, currently
  `nick@rochesterchristian.church` and `nchlshodge@gmail.com`) that always
  has commissioner access no matter what's in the Commissioners list. This
  is a safety net so access can never be fully locked out — it's not meant
  to be the day-to-day way people get access. Changing it means editing
  that function in `firestore.rules` and redeploying.
- **Everyone else** — no sign-in required to sign up as a free agent or
  register a team (see `firestore.rules` for the exact shape validation on
  those writes). They can view every tab; any write to `settings/*`,
  `matchups/*`, or `config/*` is rejected by the rules regardless of what
  the UI shows.

Neither role sends a real invite email (there's no backend for that on the
free Firebase plan) — the "Draft invite email" button next to each list
just opens *your own* mail client, addressed to whoever's in that list, with
the site link and instructions already written. You review and hit send
yourself.

If you ever host this somewhere other than `nchlshodge.github.io` or
`localhost`, add that domain under **Authentication → Settings →
Authorized domains** in the [Firebase console](https://console.firebase.google.com/project/rcu-intramurals/authentication/settings) —
Google Sign-In will fail with `auth/unauthorized-domain` otherwise.

## Customizing for a new season

Nothing here needs a code change — it's all managed live from the **Admin**
tab and the **Sign Up** tab:

- **Announcement** — a banner at the very top of the Home tab (a rained-out
  game, a schedule change, whatever's time-sensitive), with an optional
  link. Leave the message blank and save (or hit "Clear announcement") to
  remove the banner entirely — it doesn't show at all when there's nothing
  to say.
- **Season dates** — season name, when Week 1 starts, and how many weeks of
  play the season needs (regular season + playoffs + championship — the end
  date is calculated, not entered). Sign-ups have no week of their own;
  they're just open any time before Week 1. Optionally list **break weeks**
  (holidays) as one date per line — any day inside the week you want off;
  that whole calendar week is skipped with no games, and every week after it
  shifts out by one week automatically. Every week's date on the Home
  timeline and every matchup's week date on the Schedule tab accounts for
  this.
- **Devotional plan** — when the current Life.Church Bible App reading plan
  finishes, point the Devotional tab at the next one: paste its
  [bible.com/reading-plans](https://www.bible.com/reading-plans) URL, its
  day count, and optionally each day's title/verse (one per line, as
  `Title | Verse`). One day advances per calendar day from the season's
  start date.
- **Active sport**, **game times**, **team sign-ups** — same as always.

`DEFAULT_SEASON` and `DEFAULT_DEVOTIONAL_PLAN` near the top of the
`<script>` block are only the fallbacks shown before an admin has ever
saved real values — editing them isn't necessary, but it keeps a fresh copy
of the file (or a from-scratch republish) starting from something sensible
instead of stale demo data.

The one thing still worth a look each season: the four sport cards on the
**Sports** tab (season/month labels), if the sport rotation changes.
