---
name: cv
description: Create or tailor a truthful Markdown CV for CV Studio from a job description and the applicant's career facts. Use for /cv or a CV Studio compatible resume.
---

# CV for CV Studio

Use the supplied job description (JD) and applicant's CV or career facts to produce a tailored `.md` file. Ask for missing JD or career facts before drafting. If a JD link is inaccessible, ask for pasted content.

Match the requested language and role. Use only supported experience, skills and achievements; ask about essential gaps instead of inventing credentials or metrics. Target a concise A4 page, then verify pagination in CV Studio.

Use the document folder shown in CV Studio; ask for it if no destination was supplied. Save a new descriptive filename such as `CV-company-role.md` directly in that folder, preserving existing files and `.cv-studio` metadata. Keep JD and background notes outside this folder because the app lists Markdown files as documents. Without filesystem access, return the Markdown in one code block and explain where to save it as UTF-8 `.md` (not `.md.txt`).

Follow this parser-compatible structure. Replace example facts with supplied facts and omit unsupported sections. Keep English section keys even with Vietnamese body text. Avoid tables, HTML, YAML frontmatter and code fences inside the actual file.

```markdown
# Applicant name
person@example.com • City

Target role
Short summary grounded in the applicant's experience.

---

## WORK EXPERIENCE

### Role — Company
**2022 - Present | City**

- Supported achievement or responsibility.

## EDUCATION

**Degree**
University | 2018 - 2022

## SKILLS

- **Category:** Relevant verified skills

## LANGUAGES

- Language and verified proficiency
```

Check name, contact, section keys and job date lines against this structure. Report the filename and facts needing confirmation separately from the CV. Tell the user to choose its folder in CV Studio, select the CV (or use “Nạp lại” for an updated file), then “Đổi mẫu” → “Xem bản in” → “Lưu PDF”.
