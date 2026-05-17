---
name: markdown
description: Use when creating, editing, reviewing, or converting Markdown documents, README files, changelogs, docs, tables, checklists, links, frontmatter, or Markdown for GitHub/Pi/agent skills.
---

# Markdown

Use this skill for Markdown authoring, cleanup, review, and conversion tasks.

## Goals

- Produce readable, consistent Markdown.
- Preserve the user's intended content and tone.
- Prefer simple CommonMark/GitHub-Flavored Markdown unless a target renderer is specified.
- Keep headings, lists, tables, links, code fences, and frontmatter valid.

## Style Guidelines

- Use one `#` H1 title unless editing an existing document with a different structure.
- Use sentence-case headings unless the project uses title case.
- Leave one blank line around headings, lists, tables, blockquotes, and fenced code blocks.
- Use fenced code blocks with language identifiers when known:

  ````markdown
  ```bash
  command --flag
  ```
  ````

- Prefer `-` for unordered lists unless the file already uses `*` consistently.
- Use ordered lists only when order matters.
- Keep lines reasonably readable, but do not hard-wrap code blocks, tables, URLs, or frontmatter.
- For GitHub task lists, use:

  ```markdown
  - [ ] Todo
  - [x] Done
  ```

## Tables

- Use tables only when tabular data is clearer than bullets.
- Include a header separator row.
- Align columns for readability, but correctness matters more than perfect spacing.

```markdown
| Name | Purpose |
| --- | --- |
| `foo` | Does foo |
```

## Links and Images

- Prefer descriptive link text instead of raw URLs when writing docs.
- Keep raw URLs when citations are required or when the user asks for plain links.
- Do not invent links. If a URL is needed and not known, use `web_search`/`web_fetch` or ask.

## Frontmatter

When editing files with YAML frontmatter:

- Preserve existing keys unless asked to change them.
- Keep frontmatter between leading `---` fences.
- Do not format frontmatter as a code block.

Example:

```markdown
---
title: Example
---

# Example
```

## Review Checklist

Before finishing Markdown edits, check:

- Heading levels do not skip unexpectedly.
- Code fences are closed.
- Lists have consistent indentation.
- Tables have valid separators.
- Relative links still make sense from the file location.
- No accidental trailing placeholder text remains.

## Agent Skills Markdown

For Pi/Agent skill files, use this required frontmatter:

```yaml
---
name: lowercase-hyphen-name
description: Specific description of what the skill does and when to use it.
---
```

Skill names should be lowercase letters, numbers, and hyphens only.
