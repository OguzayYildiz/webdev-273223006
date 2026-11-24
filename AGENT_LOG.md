# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-10-27 - Setup and MCP exercise
- Goal: Set up the course workspace and make a small lecture MCP server.
- Delegated: Codex wrote the server and documentation at the student request; Gemini CLI was used for setup checks and tool-selection experiments.
- Checkpoints: Node, Python and Docker checked; MCP self-check passed 12/12; Gemini connected and called find_lecture.
- Went wrong: Default Gemini model returned 503 and gemini-2.5-pro was unavailable for a new user. gemini-3.5-flash-lite worked. One repeated question in the same conversation used ReadFile instead of the MCP tool.
- Changed by hand: Codex edited the code, package script and records. The student should review the implementation before explaining or submitting it.

## 2026-11-24 · Exercise 1 verification
- Goal: Verify the existing MCP submission and reconcile documentation with the course.
- Delegated: Codex ran the self-check and corrected the lecture range in the README.
- Checkpoints: The existing server passed 12/12 directly and 12/12 through the npm CLI. The original Gemini session and experiment are documented above and in the MCP README.
- Went wrong: Windows could not spawn npm.cmd directly. A sandboxed wrapper run timed out on initialization. Running the npm CLI through Node with normal process permissions passed.
- Changed by hand: No protocol code changed during this verification. The earlier entry records who wrote the original implementation.

## 2026-11-24 · Exercise 2 first slice
- Goal: Implement the first Lab Booking slice through sign-in, a protected directory and relational data.
- Delegated: Codex drafted acceptance criteria and implemented the slice. The student approved the Lab Booking topic and implementation plan. The draft still needs the student's own review against the course criteria.
- Checkpoints: A numbered migration ran in a disposable PostgreSQL database. HTTP tests passed 3/3, including direct signed-out requests and a real lab row deletion. The course structure check passed 32/32. The local seed completed.
- Went wrong: The sandbox denied loopback connections. All three tests passed when allowed to connect to their local test server.
- Changed by hand: No student keyboard or browser test was observed in this session.

## 2026-11-24 · Exercise 3 working plan and evidence
- Goal: Complete a workstation booking flow that crosses the browser, course REST API, service and PostgreSQL.
- Delegated: Migration, service, HTTP handlers, browser screens, model fallback, MCP tools and test drafts. The student approved the high-level plan to implement and push labs in order.
- Plan: Apply a migration for workstation and booking relations, including a unique workstation/date/hour constraint. Implement date and ownership rules in a service and cover its conflict path. Map service results to HTTP statuses, then add the browser screens. Add model suggestions with a fake client and use the same service behind the project's three MCP tools.
- Changes made during review: Enforced a unique database rule for simultaneous requests and checked a suggested slot again after the model responded. Used the same ordinary database-backed session for HTTP and MCP. The lesson server still works with no database.
- Checkpoints: The full local suite passed 18/18 and the course MCP check passed 12/12 through the npm CLI. Direct HTTP tests observed 201, 409, 403, 401 and 204. The integration suite applied migrations twice on empty embedded PostgreSQL instances. The Lab 2 CI test, spec and MCP jobs passed. Its coverage job correctly failed on the still-incomplete service coverage.
- What the agent did that I did not ask for: The duplicate-request test runs two API calls together to verify the database boundary. Added a separate regression check for already-started Sofia slots. Kept both tests because the schedule rule and concurrency behavior affect confirmed bookings.
- Changed by hand: Student architecture review and the in-room demonstration remain outstanding.
- Rule check: Temporarily removed the already-started-slot guard in the local copy. The relevant service test failed, and it passed again after the guard was restored. The course Exercise 3 check passed 18/18 with a Windows npm launcher shim outside the repository.

## 2026-11-24 · Exercise 4 local readiness
- Goal: Prepare the runtime image, delivery configuration, coverage gates, provider login and the evidence report.
- Delegated: Codex implemented and tested the application and reviewed the local UI with a browser.
- Checkpoints: Google verified-email linking passed against a fake provider and the original account ID. A local reservation page displayed loading, empty, error and success. Local 380, 768 and 1280 px runs showed no horizontal overflow on that screen.
- Went wrong: The first coverage gate exposed missing branches. Additional tests covered the missing decisions. The 33-test suite passed and the local gate reported 100% service lines, branches and functions, plus 95.03% backend lines. The browser inspection could not return Network timings. The student deferred Render and Neon configuration, so public URL, live timings, real OAuth and rollback remain pending.
- Deployment claims: No public deployment or live test is claimed.
