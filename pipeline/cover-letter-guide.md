# Cover letter guide

Goal: a letter that reads like Mayukh wrote it for this role, using only facts from `profile.json`.

## Shape (about 250 to 300 words, four short paragraphs)
1. **Why this role.** One or two sentences naming the team's problem in the JD's own words, and why you are suited to it.
   No flattery, no "I am excited to apply".
2. **Strongest evidence.** The one or two claims that best match the JD's top requirement, with the real number and context
   (for example Terraform adoption 33% to 80%+, or Memory Profiler support calls down 50%).
3. **Second angle.** What the JD asks for that is different: leadership scale, design systems, data-rich work, AI prototyping.
   Pick the claim that fits. If the JD asks for something with no evidence in the fact bank, say nothing about it.
4. **Close.** Where to see the work, and one line of availability. Write `[portfolio]` in the sentence, never the URL: `build-letter.mjs` turns the word into a link to the job's portfolio URL in `resume.json` (the variant once live, otherwise the main site). Rebuild the letter after the variant goes live.

## Rules
- Numbers only from `profile.json`; run `check.mjs`.
- Use the counting rules: "13+ years in UX", "5+ years leading design teams".
- If the JD's years threshold is met only by counting Wipro, write it as "13+ years in UX, plus 4 years in engineering building developer tools".
- Keywords from the JD go where the work genuinely supports them. No keyword lists.
- First person, plain sentences, no buzzwords such as "passionate" or "synergy".
- Address a person if the JD names one; otherwise "Dear Hiring Team".

## Delivery
Save as `jobs/<slug>/cover-letter.md` for the checker. For editing and sending, Claude also creates it as an editable doc.
