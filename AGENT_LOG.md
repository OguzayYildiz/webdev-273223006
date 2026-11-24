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
