# Reservation File Converter

**AI-powered file converter that turns any hotel reservation export into a Mews-ready CSV in one click.**

Built with [Lovable](https://lovable.dev) + [Claude](https://www.anthropic.com/claude). Replaced a manual data-migration step that used to cost onboarding managers hours per enterprise hotel go-live.

> 🎥 **Watch a 60-second demo:** _(paste your Loom URL here)_

---

## The problem

Every new enterprise hotel joining our PMS arrived with reservation data in a different format — CSV dumps from Opera, Excel spreadsheets from Maestro, tab-delimited files from legacy in-house systems. Before this tool, an onboarding manager would manually reformat each file to match our import schema. That took anywhere from 2 hours to a full day per property, and one bad row could break the whole import.

## The solution

Paste or upload the source file. The tool:

1. Detects the source format (delimiter, encoding, header conventions).
2. Uses Claude to map source columns to our target schema, resolving ambiguities like `guest_name` vs `first_name + last_name`.
3. Normalizes dates, currency, and boolean fields.
4. Validates against our import contract (required fields, allowed values).
5. Outputs a Mews-ready CSV with a per-row diagnostic report.

## Impact

- **Hours-to-days of saved effort** per enterprise implementation.
- **Zero broken imports** since rollout — the validation step catches issues before upload.
- Adopted team-wide within one sprint.

## Stack

- **Frontend:** React + Vite (via Lovable)
- **AI:** Claude 3.5 Sonnet via the Anthropic API for column mapping and edge-case reconciliation
- **File parsing:** PapaParse for CSV, SheetJS for Excel
- **Deployment:** Static build, internal-only

## Run locally

```bash
bun install
bun run dev
```

Set `ANTHROPIC_API_KEY` in `.env`.

## Screenshots

_(add a before/after screenshot here — messy input → clean Mews-ready output)_

---

Built by [Christopher Kendrick](https://github.com/christopherkendrick) · [The Kenroe Collective](https://kenroecollective.com)
