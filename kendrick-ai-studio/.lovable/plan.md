# Acronym definitions across portfolio content

## What will change
- Extend the existing acronym definitions with PMS, ARR, LAC, CXD, KPI, and QA while preserving LLM and RAG.
- Add a reusable inline acronym component that finds exact, case-sensitive whole-word matches and opens touch-friendly definitions.
- Use the component in project titles and descriptions, plus Training & Recognition tile labels and supporting copy.
- Leave the Skills section and all resume download generation unchanged.

## Technical details
- Build the matching expression from definition keys sorted longest first, escaping keys before creating the regular expression.
- Preserve existing typography and layout by rendering plain text fragments alongside dotted inline popover triggers.
- Verify the build, then click representative project and training acronyms at desktop and mobile viewport sizes.
