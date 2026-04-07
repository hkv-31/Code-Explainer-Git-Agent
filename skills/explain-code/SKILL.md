---
name: explain-code
description: Explains code in plain English when a PR comment contains @gitagent explain, with optional line range support
license: MIT
metadata:
  author: code-explainer-bot
  version: "0.1.0"
  category: developer-tools
---

# Skill: explain-code

## Trigger
Comment contains: `@gitagent explain`

## Input
- The comment body (may include a file path or line range, e.g. `@gitagent explain src/auth.js#L42-L60`)
- The PR diff or raw file content fetched via GitHub API

## Steps
1. Parse the comment to extract file path and optional line range
2. Fetch the file content using the github-fetch-file tool
3. If a line range is given, slice to that range only
4. Send to LLM with the explain prompt (see prompts/ directory)
5. Post the explanation back as a GitHub comment reply

## Output format
```
### What this code does

[2-4 sentence plain English summary]

**Key points:**
- [point 1]
- [point 2]
- [point 3]

**Watch out for:** [one gotcha or edge case, if any]
```
