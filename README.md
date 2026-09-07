# RCU Intramurals

A single-page intramural sports app for RCU Campus Recreation — sign-ups, team
rosters, auto-generated schedule & standings, a coordinator admin panel, a
weekly devotional, and the program's coordinator handbook.

Everything lives in one self-contained file: **`rcu-intramurals.html`**. There's
no build step and no server-side code — styling, markup, and logic are all
inline, and the RCU shield / RCC logo / RCU Alumni Association mark are
embedded as base64 images.

## Files

| File                    | Purpose                                              |
|-------------------------|-------------------------------------------------------|
| `rcu-intramurals.html`  | The app itself                                        |
| `rcu-shield.png`        | RCU shield mark (source asset, pulled from rcu.edu)    |
| `rcc-logo.png`          | RCC logo, full version                                 |
| `rcc-logo-plain.png`    | RCC logo, plain version — used in the footer credit    |

## Running it locally

No dependencies to install. From this folder:

```bash
python3 -m http.server 8743
```

Then open `http://localhost:8743/rcu-intramurals.html`. Sign-ups, the admin
panel, and the devotional will fall back to **local-only** state (stored in
memory for that browser tab) since there's no live database outside of the
hosted artifact — see below.

## Publishing as a Claude Artifact (live, shared data)

The app is built to run as a [Claude Artifact](https://claude.ai/code/artifacts)
with the `db` runtime capability, which gives it a real shared database:
sign-ups, the active sport, the devotional, and game times all sync live
across every visitor.

To publish or update it:

1. Open the file in a Claude Code session.
2. Publish it as an Artifact with:
   ```json
   {
     "db": {
       "rules": [
         { "path": "settings", "write": "admin" },
         { "path": "matchups", "write": "admin" }
       ]
     }
   }
   ```
   The rules matter — they're what actually restricts the active-sport
   setting, devotional, and game-time schedule to editors only. Everyone else
   can still sign up and view every tab.

### Granting admin (coordinator) access

There's no login system — access is controlled entirely through the
artifact's own sharing settings:

- Share the artifact link as **"can edit"** with intramural coordinators.
  They'll see the **Admin** tab (it silently tests write access on load and
  only reveals itself when the test succeeds).
- Share it as **"can view"** (or just hand out the link) with everyone else.
  They can sign up, view schedules, and read the devotional, but the Admin
  tab stays hidden and any attempt to write to `settings/*` or `matchups/*`
  is rejected by the database rules above.

## Customizing for a new season

A few things are hardcoded near the top of the `<script>` block and are worth
updating each season:

- **`SEASON`** — the season name and the anchor date for each of the 8 weeks
  (pre-season, weeks 1–6, playoffs, championship).
- **`DEFAULT_DEVOTIONAL`** — the devotional shown before an admin has posted
  one through the Admin tab.
- The four sport cards on the **Sports** tab (season/month labels) if the
  rotation changes.

Everything else — active sport, devotional content, team sign-ups, and game
times — is meant to be managed live from the **Admin** tab and the **Sign
Up** tab, not by editing the file.
