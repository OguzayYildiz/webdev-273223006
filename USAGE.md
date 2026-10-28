# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-27 | Gemini CLI: gemini-3.5-flash-lite (setup and first experiment) | 133118 | 658 | | $0.04159 estimate |

The CLI also reported 75026 cache reads. The estimate treats all reported input tokens at the standard input rate, with no cache discount: 133118 x $0.30 / 1M + 658 x $2.50 / 1M = $0.04159. Rates: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), checked 2026-10-27. Actual charges depend on account tier and billing; this is not a bill. Gemini reported API-key authentication. Earlier interrupted session statistics were not fully recorded. Codex usage is not included in this Gemini CLI row.

The fresh-session experiment succeeded, but its final token statistics were lost when the Codespace stopped and are not included above.
