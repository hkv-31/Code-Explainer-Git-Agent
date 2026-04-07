---
name: generate-tests
description: Generates minimal runnable unit tests for any file when a PR comment contains @gitagent test, auto-detecting the language and test framework
license: MIT
metadata:
  author: code-explainer-bot
  version: "0.1.0"
  category: developer-tools
---

# Skill: generate-tests

## Trigger
Comment contains: `@gitagent test`

## Input
- File path from comment or PR context
- Raw file content fetched via GitHub API

## Steps
1. Identify the language and test framework (Jest for JS/TS, pytest for Python, etc.)
2. Fetch the file content
3. Identify all exported functions or public methods
4. Generate minimal, runnable unit tests covering: happy path, edge cases, error cases
5. Post tests as a GitHub comment with a fenced code block

## Output format
```
### Generated tests for `[filename]`

Framework: [Jest / pytest / ...]

```[language]
[test code here]
```

> Run with: `[command to run tests]`
> These are stubs — add mocks for any external dependencies.
```
