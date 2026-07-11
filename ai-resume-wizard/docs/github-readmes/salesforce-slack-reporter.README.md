# Salesforce → Slack Reporting Agent

**Claude-powered agent that pulls Salesforce state daily and posts a structured account-status digest to leadership Slack.**

Gives management live visibility into 10–20 concurrent enterprise deployments with zero added meetings.

> 🎥 **Watch a 60-second demo:** _(paste your Loom URL here)_

---

## The problem

Leadership had no rolling view across our enterprise onboarding portfolio. Weekly status meetings were stale by Monday afternoon. Individual account managers each had their own template. Escalations surfaced too late.

## The solution

A scheduled job that runs every morning:

1. Queries Salesforce for every open enterprise deployment (owner, stage, days-in-stage, blockers).
2. Sends the raw account data to Claude with a structured system prompt: "You are a customer-success lead writing the morning digest for VPs. Highlight accounts at risk. Call out anything past-due."
3. Formats Claude's response as a Slack Block Kit message with clickable account links.
4. Posts to `#enterprise-onboarding-status` at 8:00 AM local.

## Impact

- **Zero added meetings.** Leadership reads the digest with coffee.
- **Blockers surfaced 2–3 days earlier** on average vs. the old weekly cadence.
- **Team accountability up** — status is now public and repeatable.

## Stack

- **Runtime:** Node.js, scheduled via GitHub Actions cron
- **AI:** Claude 3.5 Sonnet via the Anthropic API
- **Data:** Salesforce REST API (JSforce)
- **Delivery:** Slack Web API (Block Kit)

## Run locally

```bash
bun install
bun run generate    # posts one digest to a test channel
```

Required env: `SF_USERNAME`, `SF_PASSWORD`, `SF_TOKEN`, `ANTHROPIC_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`.

## Sample output

_(screenshot of a redacted digest post here)_

---

Built by [Christopher Kendrick](https://github.com/christopherkendrick) · [The Kenroe Collective](https://kenroecollective.com)
