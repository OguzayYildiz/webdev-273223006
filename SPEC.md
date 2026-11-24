# Campus Workstations

Oguzay Yildiz · 273223006

## Project option

Lab booking.

## Goals

- Students can find, reserve and release a weekday workstation slot.
- Staff can add labs and workstations and see bookings by date.

## Non-goals

- No payments.
- No email or push reminders.
- No remote control of workstations.

## Constraints

- Node.js 22+, PostgreSQL, browser HTML, CSS and JavaScript.
- Numbered SQL migrations. Local passwords are stored as salted scrypt hashes.
- Test data stays in a disposable local database.

## The model feature

- Model: Gemini via a service adapter. It can rank candidate slots described by a student.
- Input: a short scheduling preference and a list of available candidate slots, without account details.
- Output: the ID of one available candidate, verified before display.
- When it fails: timeout, unavailable key, rate limit or invalid output leaves manual selection available.

## Auth

- Local: email and password with a server-side session.
- Provider: Google OAuth authorization code flow on the server.
- Linking: a verified Google email can link to an existing password account. Both sign-in methods create the same kind of session.

## MCP tools

| Tool | What it does | Who may call it |
| --- | --- | --- |
| list_free_slots | Lists the free workstation slots in a lab for a selected weekday. | Signed-in user |
| my_bookings | Lists only the bookings owned by the user represented by the session token. | Token owner |
| book_slot | Books one still-available workstation slot for the token owner. | Token owner |

## UI

HTML, CSS and browser JavaScript. Sign-in, lab directory, booking screen, personal bookings and staff management.

## Architecture

The first slice renders sign-in and the lab list on the server. The feature architecture will be documented in Exercise 3.

## Acceptance criteria

- [AC-1] A signed-in student selecting a lab and weekday sees the real workstations and available slots.
- [AC-2] A student booking an available slot receives 201 and one booking row belongs to that student.
- [AC-3] A student booking a slot already reserved receives 409 and the number of reservation rows stays the same.
- [AC-4] An owner cancelling a reservation receives 204 and the slot becomes available again.
- [AC-5] Another student cancelling a reservation receives 403. A signed-out request receives 401. The row stays in place.
- [AC-6] A staff user can add a lab and workstation and view bookings for a date. A student receives 403 from the staff API.
- [AC-7] When the model suggests an unavailable slot or is unavailable, the student sees a readable message and can still pick a free slot.
- [AC-8] A valid MCP session can list free slots, book a slot and list only its owner's reservations. A missing session cannot use project tools.

### Slice 1: sign-in and the lab directory

- [AC-9] A visitor opening the lab directory is redirected to sign-in. Its API returns 401 without a session.
- [AC-10] A seeded student signs in with a password and sees both seeded lab names and their locations.
- [AC-11] Deleting one lab from a disposable database and reloading removes it from the rendered directory while the other lab remains.

## Traceability

| Criterion | Test |
| --- | --- |
| AC-9 | `test/slice-one.test.js` |
| AC-10 | `test/slice-one.test.js` |
| AC-11 | `test/slice-one.test.js` |

## Spec vs result

The first slice originally described only a redirect for a signed-out visitor. The implementation also exposes the directory as a REST resource, so AC-9 now explicitly requires a 401 from that resource without a session.
