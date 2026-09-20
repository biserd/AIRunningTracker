# Native coach UX refinement

Scope: native iOS/iPadOS app on `codex/ios-testflight`. No production database,
Cloudflare Worker, main-site, pricing, or subscription changes.

## Navigation

- Coach remains the default. Voice and the composer remain visible. Check-ins and
  supporting context are collapsed; a saved briefing is shown for an empty chat.
- Plan contains today and upcoming workouts, with an explicit coach-adjustment
  action. The internal `schedule` route remains compatible with push links.
- Progress exposes Runner Score and the activity calendar directly, with links
  to run history and read-only coach insights.
- Settings separates account, connections, coaching, and notifications. Settings
  navigation uses rows with chevrons, not competing primary buttons.

## Reminders

One list includes Apple, email, and WhatsApp reminders. Channel-specific creation
flows retain their existing service capabilities. Apple notification settings no
longer contain a second reminder list. The email connection screen is separate
from creating a reminder. Cancellation requires confirmation.

## Sign-in recovery

Verification displays `Signing you in…`. Transport and server failures allow an
explicit retry. Expired/invalid links ask for a fresh link. A failed request no
longer permanently suppresses the same incoming link through lifecycle dedup.
Retry tokens stay in memory and are cleared after success, a fresh link request,
or sign-out; single-use server verification is unchanged.

This improves recovery from the reported lost connection. It does not establish
the cause of that production transport failure or prove a real signup succeeded.

## Visual and accessibility changes

Warm semantic surfaces, restrained primary orange, human calendar dates, calendar
targets at least 44 points, and less promotional/filler text. Voice explains when
it is temporarily disabled. Existing Dynamic Type and iPad sidebar are preserved.

## Verification

Unit coverage: retry classification, date boundaries, push route compatibility.
Offline iPhone/iPad UI coverage: navigation and rotation, native connection screens,
unified reminders, direct Progress entry, score fixture and insights. Production
API access and real email delivery are not exercised by these UI fixtures.

## Release evidence

- Source: `618802a`, tag `ios-testflight-20260919-ux-refinement`.
- iPhone and iPad validation passed: GitHub Actions run `35477093613`.
- Test-gated signed upload passed: run `35477102709`; Apple upload reported no errors.
- App Store Connect processed **1.0 (22)** and the build was assigned to the
  existing **AITracker Internal** group (2 testers). Testing notes saved.
- No external beta review or public App Store release was submitted.
