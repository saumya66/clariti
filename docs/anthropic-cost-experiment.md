# Anthropic Cost Experiment Runbook

## Purpose

`backend/scripts/anthropic_cost_experiment.py` validates Clariti's local Claude cost
calculation against the balance and usage shown in Claude Console. It is an isolated
developer utility: it does not run during normal Clariti execution, change user data, or
write to MongoDB.

The controlled experiment validates the billing calculation. It is representative of
Clariti's request shapes, but it is not a byte-for-byte replay of a complete Clariti test
run. Production billing should also be verified once using usage captured from a real
Clariti run.

## What it sends

With `--execute`, the script sends five sequential, billable requests:

1. A short text request.
2. A request containing a generated, non-sensitive synthetic screenshot.
3. A Computer Use request using Clariti's Computer Use tool version and beta flag.
4. A prompt long enough to create a five-minute prompt cache entry.
5. The same cached request again, which should produce a cache read.

The script never saves prompts, model responses, screenshots, or the API key in its
report. It records request IDs, token categories, cost components, and totals.

## Prerequisites

- Run commands from the repository root.
- Use the Python environment at `backend/.venv`.
- Put `ANTHROPIC_API_KEY` in the process environment or `backend/.env`.
- Prefer a dedicated API key used only for this experiment, so dashboard traffic can be
  attributed unambiguously.
- Verify the configured model prices against Anthropic's official pricing page before a
  run. Prices can change.

Never paste an API key into a command, commit it, or include it in an experiment report.

## Safe preview

This prints the model, pricing, and planned cases without making API requests:

```bash
backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py
```

Use preview mode after changing a model or its prices to confirm the selected
configuration before spending.

## Running the experiment

1. Open Claude Console and record the current balance or cost for the dedicated API key.
2. Ensure no other process is using that key.
3. Run:

```bash
backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py --execute
```

4. Keep the printed `Calculated experiment total`.
5. Wait for Claude Console to update.
6. Calculate `dashboard value after - dashboard value before` for a cost total, or
   `balance before - balance after` for a remaining balance.
7. Compare that amount with the script's calculated total. A dashboard showing only two
   decimal places will round the exact result to cents.

Reports are written by default to the gitignored directory:

```text
backend/data/cost-experiments/anthropic-<UTC timestamp>.json
```

Choose another local report path with:

```bash
backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py \
  --execute \
  --output /absolute/local/path/report.json
```

Do not commit generated reports unless they have been reviewed for operational metadata
such as request IDs.

## Verifying the cache test

The report's `cache_write` case should contain a positive
`cache_write_5m_tokens` value. The following `cache_read` case should contain a positive
`cache_read_tokens` value and zero cache-write tokens.

For example:

```json
{
  "case": "cache_read",
  "usage": {
    "input_tokens": 3,
    "output_tokens": 7,
    "cache_write_5m_tokens": 0,
    "cache_write_1h_tokens": 0,
    "cache_read_tokens": 8333
  }
}
```

If the second call writes the cache again, do not treat cache-read pricing as validated.
Confirm that both calls use identical cacheable content and that the second call starts
within five minutes of the first one.

## Changing the model

The `--model` option only accepts models whose prices are explicitly configured. This is
intentional: the script refuses to calculate a cost for a model with unverified pricing.

To add a model:

1. Find the exact API model alias and pinned snapshot ID in Anthropic's official model
   documentation.
2. Find its current prices per million tokens for:
   - Normal input
   - Output
   - Five-minute cache writes
   - One-hour cache writes
   - Cache reads
3. In `backend/services/anthropic_cost.py`, create a `ModelPricing` value using
   `Decimal` strings. Include the official source URL and the date prices were verified.
4. Add both the public alias and pinned response model ID to `MODEL_PRICING`, pointing to
   that same pricing value. Anthropic may receive the alias but return the pinned ID.
5. Run the calculator tests.
6. Run preview mode with the new model.
7. Record a fresh dashboard baseline, then execute the experiment.

Example structure:

```python
NEW_MODEL_PRICING = ModelPricing(
    input=Decimal("..."),
    output=Decimal("..."),
    cache_write_5m=Decimal("..."),
    cache_write_1h=Decimal("..."),
    cache_read=Decimal("..."),
    source="https://platform.claude.com/docs/...",
    verified_on="YYYY-MM-DD",
)

MODEL_PRICING = {
    # Existing entries...
    "claude-new-model": NEW_MODEL_PRICING,
    "claude-new-model-YYYYMMDD": NEW_MODEL_PRICING,
}
```

Then preview or execute it with:

```bash
backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py \
  --model claude-new-model
```

Changing only `--model` without adding verified pricing fails safely and makes no API
request.

If a new model uses a different Computer Use tool version, beta flag, cache minimum, or
pricing rule, update those experiment parameters as well. Compare them with Clariti's
current `backend/agents/claude_computer_use_agent.py` configuration before running.

## Running the automated calculator tests

These tests use fake token counts. They do not contact Anthropic and do not spend money:

```bash
PYTHONPATH=backend backend/.venv/bin/python \
  -m unittest backend.tests.test_anthropic_cost_experiment -v
```

Run them whenever pricing logic, usage parsing, or model configuration changes.

The post-response capture tests are also non-billable:

```bash
PYTHONPATH=backend backend/.venv/bin/python \
  -m unittest backend.tests.test_anthropic_cost_capture -v
```

## Interpreting dashboard rows

Claude Console may display all input categories in one input-token total. The local report
keeps them separate because they have different prices:

```text
Dashboard input tokens
= normal input tokens
+ five-minute cache-write tokens
+ one-hour cache-write tokens
+ cache-read tokens
```

Therefore, compare both the summed token count and the calculated dollar total.

## Updating the experiment when Clariti changes

Before using this utility after a material AI integration change, compare it with the
production request code and update the experiment when any of these change:

- Default Claude model
- Computer Use tool version or beta flag
- Prompt-cache TTL or cache configuration
- Server-side paid tools
- Inference geography or service tier
- Anthropic pricing
- Usage response fields

Client-side Computer Use tools are billed through their input and output tokens. If
Clariti begins using separately billed server-side tools, their usage and pricing must be
added to the calculator before the experiment can validate total spend.

## Troubleshooting

### `ANTHROPIC_API_KEY` is not set

Set it in the environment or `backend/.env`. Do not pass it on the command line.

### Unknown or unsupported model

Add verified `ModelPricing` entries for both its alias and pinned ID. Do not bypass this
check with guessed prices.

### Cache read remains zero

Check that the two cache calls are identical, exceed the model's minimum cacheable prompt
length, run sequentially, and complete within the cache TTL.

### Dashboard differs by a few cents

First account for dashboard rounding and update delay. Then ensure no other process used
the experiment key. Compare each dashboard token row with the report before changing the
calculator.

### Experiment stops midway

Successful earlier requests may still have been billed even if no final report was
written. Check the terminal output and Claude Console before rerunning.

## Capturing one exact Clariti run

After the controlled experiment passes, use the opt-in real-run recorder to verify that
Clariti captures every response generated by its actual agents. The recorder runs only
after each existing Anthropic call returns; it does not alter the model, prompt, tools,
screenshots, messages, beta flags, cache settings, or token limit sent to Anthropic.

Both production call paths are instrumented:

- `BaseAgent._call_claude()` covers planner, generator, learner, and other standard
  Claude agents.
- `ClaudeComputerUseAgent._call()` covers every turn in the interactive Computer Use
  loop.

### Enable capture

Choose a new session ID for every validation run. Add these values to `backend/.env`:

```dotenv
CLARITI_CAPTURE_AI_COSTS=true
CLARITI_COST_CAPTURE_SESSION=real-product-registration-001
```

The session ID must begin with a letter or number, contain only letters, numbers, dots,
underscores, or hyphens, and be no longer than 80 characters.

Restart the local backend after changing `backend/.env`. A running process will not
reload the file automatically.

### Perform the run

1. Record the Anthropic dashboard balance or cost baseline.
2. Ensure no unrelated process is using the same API key.
3. Start exactly one Clariti feature/test-suite execution.
4. Let the execution finish, including post-run learner/context updates.
5. Do not run unrelated generation, planning, or context-building work while capture is
   enabled; those legitimate calls would be included in the same session.

Each completed Anthropic response is immediately appended and `fsync`ed to:

```text
backend/data/cost-experiments/real-runs/<session-id>.jsonl
```

The file contains usage and cost metadata only. It does not contain prompts, model
responses, screenshots, operator input, tool payloads, or API keys. Response IDs are
deduplicated so the same Anthropic response cannot be charged twice within a capture.

Capture failures are logged with `[AI-COST-CAPTURE]` and never fail the product action
that produced a successful Anthropic response.

### Disable capture

After the learner finishes, change:

```dotenv
CLARITI_CAPTURE_AI_COSTS=false
```

Then restart the backend before doing unrelated Clariti work.

### Summarize the captured run

Use the same session ID:

```bash
backend/.venv/bin/python \
  backend/scripts/summarize_anthropic_cost_capture.py \
  real-product-registration-001
```

The summary reports:

- Response count and unique response count
- Duplicate response IDs
- Cost grouped by agent
- Normal input, output, cache-write, and cache-read token totals
- The complete calculated run cost

The integrity line must say:

```text
Capture integrity: OK (one event per unique Anthropic response ID)
```

Wait for Claude Console to update and compare the complete calculated run cost with the
dashboard change. Account for cent-level display rounding. A match validates both the
calculator and coverage of the real Clariti call paths.

Reusing a session ID appends new unique responses to the existing file, so always use a
new ID for a new dashboard comparison.

## Validated benchmark results

The calculator and both production capture hooks were validated against Claude Console
on 2026-11-01 using Claude Haiku 4.5.

### Controlled calibration

- Two controlled runs calculated a combined cost of `$0.04255405`.
- The displayed dashboard balance changed from `$16.04` to `$16.00`.
- Normal input, output, image, Computer Use, five-minute cache-write, and cache-read token
  categories matched the dashboard request rows.

### Exact Clariti execution

- Capture session: `real-clariti-20261101-01`
- Anthropic responses captured: 38
- Unique response IDs: 38
- Duplicate IDs: 0
- Calculation errors: 0
- Computer Use responses: 37, costing `$0.23527845`
- Project context learner responses: 1, costing `$0.00912100`
- Complete calculated cost: `$0.24439945`
- Displayed dashboard balance: `$16.00` before and `$15.75` after

The apparent `$0.25` displayed reduction is consistent with the exact `$0.24439945` cost
because both dashboard balances are independently rounded to two decimal places. Every
dashboard request row's input and output totals matched its captured response usage. This
validates both the cost formula and coverage of Clariti's two production Anthropic call
paths for an execution plus its post-run learner.
