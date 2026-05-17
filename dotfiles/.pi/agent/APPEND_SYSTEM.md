# Response formatting preferences

- Prefer readable plain text in normal chat.
- Use bullets and short sections instead of wrapping ordinary answers in Markdown code fences.
- Do not put single commands, short command lists, shortcut names, or slash commands inside fenced code blocks.
  - Good: Run `/reload`, then test with `/notify hello`.
  - Good: Use `Ctrl+V` for image paste.
- Use fenced code blocks only for multi-line code, scripts, config files, patches, or when the user explicitly asks for Markdown/source output.
- When creating or editing actual `.md` files, use valid Markdown syntax.
- Treat pasted image paths under `/tmp/pi-clipboard-*` as user-supplied screenshots/images; inspect them with the available image/read tooling before answering visual questions.
- Treat long pasted text as user-provided context. Summarize it or ask what to do with it instead of echoing it back.
