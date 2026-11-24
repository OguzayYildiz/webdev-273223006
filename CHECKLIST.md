# Lab submission checklist

Oguzay Yildiz · 273223006

## Exercise 1 · MCP server

- [x] Two lecture tools, a start command, a session transcript and a tool-selection experiment are in the repository.
- [x] The course MCP self-check passed 12/12 on 2026-11-24 when started directly and through the npm CLI.
- [x] GitHub Actions reported the MCP job green on 8501fb3.
- [ ] Show the course assistant the implementation and its authorship record. The original log records agent-written protocol code, and the course asks the student to write it.
- [ ] Record a new experiment with complete usage statistics if needed. One earlier session had no retained measurements.

## Exercise 2 · Specification and first slice

- [ ] Confirm the topic registration and student-authored acceptance criteria.
- [x] Verified sign-in, the protected directory and a real database row change in 3/3 HTTP tests. The course structure check passed 32/32.

## Exercise 3 · Full feature

- [x] Booking, cancellation, authorization, duplicate prevention and AC traceability have local test evidence. Feature steps are individually committed. The course check passed 18/18.
- [x] Model fallback and revalidation passed with fake clients. MCP integration passed with an ordinary session in tests and lecture conformance remained 12/12.

## Exercise 4 · Deployment

- [ ] Verify a public deployment, provider sign-in and database persistence.
- [x] Added Docker, deployment configuration, OAuth linking and readiness notes. The 33-test suite passed locally with 100% service lines and branches and 95.03% backend line coverage.
- [x] Verified the four reservation states and no horizontal overflow on that screen at 380, 768 and 1280 px.
- [ ] Record the Linux CI result and complete remaining UI evidence across all screens.
- [ ] Public URL, real OAuth and live rollback evidence are pending. The student deferred Render and Neon setup.

## Exercise 5 · Peer review

- [ ] Complete the assigned peer exchange, fixes, CI verification and defence notes.
