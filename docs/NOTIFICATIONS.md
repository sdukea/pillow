# Notifications (designed, P8)

Nothing here is built yet. Email needs accounts, a server and an email
provider. **Choosing those providers needs the project owner's approval**,
because they are external services, possibly paid, that will hold student
data.

## What gets sent

| Message | When | Content |
|---|---|---|
| Reviews due | Daily, only if reviews are due | How many, and the first concept, with one link |
| Weekly plan | Monday morning | This week's concepts and core problems; last week's progress |
| Streak at risk | Optional, off by default | Nothing done in 3 days |
| Mock interview ready | Week 16 on | Link to start |

Never sent: marketing, other students' data, or anything not set out
above.

## Preferences (all per student)

- **On/off per message type:** reviews and the weekly plan are on by
  default; streak is off.
- **Time zone:** taken from the browser at signup, and editable.
- **Quiet hours:** default 22:00–08:00 local time. Messages due in quiet
  hours wait until they end.
- **Delivery time:** the preferred time of day (default 18:00).
- **Rate limit:** at most one email a day, so reviews and the weekly plan
  are combined.
- **Unsubscribe:** a one-click unsubscribe link in every email. It works
  without signing in.

## Design

- **Scheduler:** a scheduled job runs every 15 minutes. It selects
  students whose local delivery time has arrived and who aren't in quiet
  hours, then computes due reviews with the same model code (it's
  shared), then sends.
- **Idempotent:** a send log is keyed by (student, type, local date), so
  each message goes at most once.
- **Bounces and complaints** disable email for that address.
- **Testable:** the scheduling logic is a pure function of (preferences,
  evidence, now). Unit tests cover time zones, DST changes, quiet hours
  that span midnight, and the rate limit.

## Provider options (for approval)

| Need | Candidates |
|---|---|
| Email | Resend, Postmark, Amazon SES |
| Database and auth | Supabase (Postgres plus auth), or Postgres plus an auth library |
| Hosting (server and scheduled jobs) | Fly.io, Render, or Supabase functions plus cron |

These choices are recorded as an ADR once approved.
