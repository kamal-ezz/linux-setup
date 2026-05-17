---
name: web-research
description: Use for current web research, fact checking, documentation lookup, or reading web pages. Guides use of the free web_search and web_fetch tools with citations.
---

# Web Research

Use this skill when the user asks for current information, recent news, external documentation, package/API details, pricing/status, or anything that may have changed after training.

## Workflow

1. Search first with `web_search` unless the user already supplied a URL.
2. Prefer official/primary sources when possible:
   - project documentation
   - vendor pages
   - GitHub repositories/releases/issues
   - standards/specifications
   - official blogs/changelogs
3. Use `web_fetch` on promising URLs before relying on detailed claims from search snippets.
4. Cross-check important claims with at least two sources when the answer depends on accuracy.
5. Cite the URLs you used in the final answer.

## Tool usage

Search:

```ts
web_search({ query: "specific query", maxResults: 5 })
```

Fetch:

```ts
web_fetch({ url: "https://example.com/page" })
```

## Query patterns

- For official docs: `site:docs.example.com feature name`
- For GitHub: `repo owner/name issue error text` or `site:github.com owner repo feature`
- For recent changes: include the year/month or terms like `release notes`, `changelog`, `pricing`, `status`.
- For comparisons: search each product/source separately before synthesizing.

## Output expectations

- Be concise.
- Mention uncertainty if sources disagree or results are weak.
- Include citations as plain URLs near the claims they support.
- Do not cite a page unless you searched or fetched it in this session.
