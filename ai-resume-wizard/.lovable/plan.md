## Goal
Turn Christopher’s experience into a tight, 2-page resume targeted at AI Deployment / Enablement / Customer Success roles at companies like OpenAI and Lovable, delivered as:
1. A shareable web page on the app (`/resume`)
2. An editable DOCX file
3. A print-ready PDF

## Design direction
- Minimal & editorial: generous whitespace, clean typography, restrained color, strong hierarchy
- Single-column layout with clear section dividers
- No photo, no graphics beyond subtle typographic structure
- Colors pulled from the existing project token system (or a small neutral/slate accent set)

## Content edits
- Refine headline to work for both "AI Deployment & Enablement Manager" and adjacent AI customer-success / implementation roles
- Keep the strongest, most quantified bullets; trim older/less relevant details so the resume fits 2 pages cleanly
- Lead with AI-specific achievements (Lovable/Claude automations, onboarding efficiency gains, executive enablement)
- Move "AI & Technical Proficiencies" above Education for relevance
- Keep certifications that reinforce AI/enablement credibility

## Implementation steps

### 1. Web page (`/resume`)
- Create `src/routes/resume.tsx` with a clean, printable resume layout
- Use Tailwind semantic tokens and a minimal editorial style
- Add a "Download PDF / DOCX" section with links to the generated artifacts
- Add route-specific `head()` with title/description for SEO

### 2. DOCX generation
- Generate a 2-page, US Letter DOCX using `docx-js`
- Match the web page content and visual hierarchy
- Save to `/mnt/documents/Christopher_Kendrick_Resume.docx`

### 3. PDF generation
- Convert the DOCX to PDF via LibreOffice
- Inspect both pages as images for margins, overflow, and formatting issues
- Save final PDF to `/mnt/documents/Christopher_Kendrick_Resume.pdf`

### 4. QA
- Verify web page renders correctly in the preview
- Verify DOCX opens cleanly and is 2 pages
- Verify PDF is 2 pages with no overflow, clipping, or formatting defects

## Deliverables
- `/src/routes/resume.tsx` — live resume page
- `/mnt/documents/Christopher_Kendrick_Resume.docx` — editable resume
- `/mnt/documents/Christopher_Kendrick_Resume.pdf` — print-ready resume

## Notes
- Since you mentioned Lovable, I’ll keep the positioning broad enough for AI Deployment/Enablement roles while still speaking directly to AI-product companies.
- No backend or auth needed; this is a static content page plus generated documents.