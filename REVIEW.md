# Peer review of TU Sofia Lab Booking

Reviewed commit [`65a699dcffbbc57aa50c343d52c24e1aff965e2f`](https://github.com/anka190314/webdevAhmetAtalay--273223011-/commit/65a699dcffbbc57aa50c343d52c24e1aff965e2f).

Reviewer Oguzay Yildiz · 273223006
Assigned peer Ahmet Atalay · 273223011
2026-11-24 · Source review draft, pending student triage and reciprocal review.

| ID | Finding | Severity | Source | Draft verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | A signed-in non-owner can cancel any booking | High if confirmed | Pass A | False positive | The route passes the session user ID to the service, which compares it with the booking owner and throws before deleting. The route maps this to 403. [Service](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/src/services/bookingService.js#L132-L140) · [Route](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/src/routes/labs.js#L94-L104) |
| R2 | Slot display times are defined in both the UI and the MCP adapter | Low | Pass A | Confirmed | The browser and MCP each define a six-entry label array. A schedule change requires both representations to be updated. The search prompt also embeds a description of the schedule. [Browser](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/public/lab.html#L76-L83) · [MCP](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/mcp-server/server.js#L55-L62) · [Model prompt](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/src/services/search.js#L60-L70) |
| R3 | The responsive checkbox overstates the available evidence | Low | Pass A | Confirmed | The checked line names 380, 768 and 1280 px. Its verification note lists 375, 820 and roughly 1190 px. Exact-width results are unverified in the reviewed evidence. [UI evidence](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/docs/UI.md#L11-L12) |
| R4 | A same-day booking can use an elapsed slot | Low | Pass A | Confirmed | Creation validates the day and slot index before insertion, with no check of the start time within the selected day. The peer's readiness report independently records this behavior. [Booking service](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/src/services/bookingService.js#L112-L128) · [Readiness](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/READINESS.md#L89-L92) |
| R5 | Earlier date responses may replace the grid for a later date selection | Low | Pass A | Unsure | The browser snapshots the selected date before awaiting the request and renders when it returns. The source has no visible current-selection guard at that boundary. A delayed-response browser test is still pending. [Date loading](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/public/lab.html#L174-L210) |
| R6 | The specified personal bookings screen is absent | Low | Pass A | Confirmed | The specification lists the screen but records it as unimplemented in the architecture table. The readiness report identifies booking-screen and MCP alternatives. [Specified screen](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/SPEC.md#L64-L69) · [Architecture](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/SPEC.md#L101-L105) |

## Precision per pass

Pass A used Codex for a read-only source pass against the pinned commit. The prompt was to compare the repository to the official lab requirements, trace authorization and service boundaries, and substantiate each candidate with a file and line. The draft counts were four confirmed, one false positive and one unsure. Precision is 4 / (4 + 1) = 0.80 for the decided rows. The student still needs to sign off on the verdicts. The independent second agent pass is pending.

## Confirmed issues no agent found

The separate student-led manual pass is pending. The initial source walkthrough confirmed that MCP resolves a user token and delegates booking operations to the relevant services. The model adapter has a missing-key fallback, a timeout and input shaping in the service. The reviewed source was read locally, with no requests to the peer's deployed app. A lockfile-only npm audit reported zero advisories at the time of this review. [MCP dispatch](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/mcp-server/server.js#L200-L231) · [Model adapter](https://github.com/anka190314/webdevAhmetAtalay--273223011-/blob/65a699dcffbbc57aa50c343d52c24e1aff965e2f/src/services/search.js#L46-L85)

## Replies to the review of my project

Pending Ahmet's review of this project. No received findings, test-first corrective commits or redeployment results were available to record.
