# RCU Intramurals

A single-page intramural sports app for RCU Campus Recreation — sign-ups, team
rosters, auto-generated schedule & standings, a coordinator admin panel, a
daily Bible App reading, and the program's coordinator handbook.

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

Then open `http://localhost:8743/rcu-intramurals.html`. Sign-ups and
everything set from the admin panel (active sport, season dates, the
devotional plan, game times) will fall back to **local-only** state (stored
in memory for that browser tab) since there's no live database outside of
the hosted artifact — see below.

## Publishing as a Claude Artifact (live, shared data)

The app is built to run as a [Claude Artifact](https://claude.ai/code/artifacts)
with the `db` runtime capability, which gives it a real shared database:
sign-ups, the active sport, season dates, the devotional plan, and game
times all sync live across every visitor.

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
   The rules matter — they're what actually restrict the active sport,
   season dates, the devotional plan, and the game-time schedule to editors
   only. Everyone else can still sign up and view every tab.

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

Nothing here needs a code change — it's all managed live from the **Admin**
tab and the **Sign Up** tab:

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
