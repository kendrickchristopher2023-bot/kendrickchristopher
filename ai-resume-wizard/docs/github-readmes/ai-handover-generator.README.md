# AI Handover Generator

**Generates management-ready handover reports from account data on demand. Zero disruption during PTO across active enterprise deployments.**

Built with [Claude](https://www.anthropic.com/claude) + [Lovable](https://lovable.dev). Self-serve for the onboarding team.

> 🎥 **Watch a 60-second demo:** _(paste your Loom URL here)_

---

## The problem

Planned absences (PTO, conferences, parental leave) were a recurring risk to active enterprise deployments. Writing a good handover doc for 10+ accounts took a full day the manager didn't have, so handovers got skipped or rushed and coverage suffered.

## The solution

A web tool the onboarding manager opens the morning they're leaving:

1. Pulls their active accounts from Salesforce.
2. For each account, sends state + recent activity to Claude with a handover prompt: "You are the outgoing account manager. Write a concise brief for the covering manager: where the deployment stands, immediate next steps, known risks, key stakeholder contacts."
3. Assembles the outputs into a single PDF the covering manager can open in one click.
4. Optionally posts a summary thread in the coverage-team Slack channel.

## Impact

- **Zero deployment disruption** across covered accounts.
- **Handover prep dropped from ~1 day → ~15 minutes.**
- Adopted as the default for every planned absence on the team.

## Stack

- **Frontend:** React + Vite (via Lovable)
- **AI:** Claude 3.5 Sonnet via the Anthropic API
- **Data:** Salesforce REST API (JSforce)
- **PDF:** [pdf-lib](https://pdf-lib.js.org/)
- **Delivery:** Slack Web API (optional)

## Run locally

```bash
bun install
bun run dev
```

Required env: `SF_USERNAME`, `SF_PASSWORD`, `SF_TOKEN`, `ANTHROPIC_API_KEY`, optional `SLACK_BOT_TOKEN`.

## Screenshots

_(add a screenshot of the covering-manager brief here — redact any real customer data)_

---

Built by [Christopher Kendrick](https://github.com/christopherkendrick) · [The Kenroe Collective](https://kenroecollective.com)
