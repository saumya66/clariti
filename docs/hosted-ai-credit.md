# Hosted AI credit runbook

Clariti's Anthropic key exists only on the cloud backend. The DMG and local Python
sidecar authenticate with the user's Clariti JWT and call `POST /api/v1/ai/inference`.

## Deploy

Set these cloud environment variables:

```text
ANTHROPIC_API_KEY=<server key>
DEFAULT_FREE_CREDIT_USD=1.00
AI_REQUEST_LEASE_SECONDS=300
```

Install `cloud-backend/requirements.txt` and deploy the cloud service before distributing
a DMG that uses the gateway. Startup creates the `ai_usage_events` indexes and the default
global `system_settings` AI switch.

## Assign a user's allowance

From the repository root, with the cloud backend environment pointing at the intended
MongoDB database:

```bash
cloud-backend/.venv/bin/python cloud-backend/scripts/set_user_ai_credit.py user@example.com 2.00
```

This sets the user's total allowance to $2. To add $1 without replacing the existing
allowance:

```bash
cloud-backend/.venv/bin/python cloud-backend/scripts/set_user_ai_credit.py user@example.com 1.00 --add
```

The equivalent MongoDB Atlas edit is to set `free_credit_microusd`; $2 is `2000000`.
Do not reset `spent_microusd` when increasing an allowance.

## Pause or resume every AI request

```bash
cloud-backend/.venv/bin/python cloud-backend/scripts/set_ai_requests_enabled.py off --reason "Private beta temporarily paused"
cloud-backend/.venv/bin/python cloud-backend/scripts/set_ai_requests_enabled.py on
```

This updates the single `system_settings` document whose `_id` is `ai`; it is not a
per-user flag. Use `ai_access_status` on an individual user to disable only that account.

## Audit usage

Every successful response creates one `ai_usage_events` document containing user ID,
unique Anthropic response ID, requested/returned model, token categories, the immutable
pricing snapshot, cost in micro-USD, agent/call site, and timestamp. Prompts, screenshots,
tool content, responses, and API keys are not copied into the ledger.

The unique response-ID index prevents duplicate charging. `spent_microusd` is the user's
charged total and `/api/v1/ai/credit` returns allowance, spend, and remaining credit.

## Build the DMG

```bash
cd frontend
npm run build
```

The command rebuilds the Python sidecar first and then packages Electron. `backend/.env`,
`cloud-backend/.env`, and `backend/data` are excluded. Runtime local data is written under
Electron's application-data directory through `CLARITI_DATA_DIR`.
