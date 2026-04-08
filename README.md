<div align="center">

<img src="https://img.shields.io/badge/GitAgent-Hackathon-black?style=for-the-badge&logo=github" />
<img src="https://img.shields.io/badge/Powered%20by-Groq-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />

# Code Explainer Bot

### A GitAgent that lives inside your PRs — explains code and generates tests on demand.

**Just comment `@gitagent explain` or `@gitagent test` on any PR. Done.**

[View Demo PR 1 →](https://github.com/hkv-31/Gesture-Recognition/pull/1)
[View Demo PR 2 →](https://github.com/hkv-31/Code-Explainer-Git-Agent/pull/1)

</div>

---

## What it does

Drop a comment on any pull request and the bot replies instantly — no setup, no context switching, no copy-pasting into ChatGPT.

```
@gitagent explain src/auth/token.js#L20-L45
```

> **What this code does**
>
> This function validates a JWT token and extracts the user payload. It checks
> the signature against the secret key and throws if the token is expired.
>
> **Key points:**
> - Uses `jsonwebtoken` under the hood — not custom crypto
> - The `ignoreExpiration` flag is intentionally false here
> - Returns a plain JS object, not a class instance
>
> **Watch out for:** If `JWT_SECRET` is undefined in env, this will throw a confusing `secretOrPrivateKey` error rather than a missing env error.

Or generate tests instantly:

```
@gitagent test src/utils/format.js
```

---

## Commands

| Command | What it does |
|---|---|
| `@gitagent explain <file>` | Explains an entire file in plain English |
| `@gitagent explain <file>#L10-L30` | Explains a specific line range |
| `@gitagent test <file>` | Generates unit tests (auto-detects Jest, pytest, RSpec, etc.) |

---

## Setup in 3 steps

### 1. Copy the workflow into your repo

```bash
mkdir -p .github/workflows
curl -o .github/workflows/agent.yml \
  https://raw.githubusercontent.com/hkv-31/Code-Explainer-Git-Agent/main/.github/workflows/agent.yml
```

### 2. Add your Groq API key as a secret

Go to your repo → **Settings → Secrets → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `GROQ_API_KEY` | Get free at [console.groq.com/keys](https://console.groq.com/keys) — no card required |

`GITHUB_TOKEN` is auto-provided by GitHub Actions. Nothing else needed.

### 3. Open a PR and try it

Comment `@gitagent explain <any-file.js>` and watch the bot reply in seconds.

---

## How it works

```
PR comment → GitHub Actions trigger → fetch file via GitHub API
     → send to Groq (Llama 3) → post explanation as comment reply
```

Built on the [gitagent open standard](https://github.com/open-gitagent/gitagent) — fully framework-agnostic.

```
Code-Explainer-Git-Agent/
├── agent.yaml                  # gitagent manifest
├── SOUL.md                     # agent identity & tone
├── RULES.md                    # hard constraints
├── index.js                    # runtime logic (~120 lines)
├── skills/
│   ├── explain-code/SKILL.md   # explain skill
│   └── generate-tests/SKILL.md # test generation skill
└── .github/workflows/
    └── agent.yml               # GitHub Actions trigger
```

Export to any framework with zero code changes:

```bash
npm install -g @open-gitagent/gitagent

gitagent validate                        # confirm spec compliance
gitagent export --format system-prompt  # plain system prompt
gitagent export --format openai         # OpenAI Agents SDK
gitagent export --format claude-code    # Claude Code
gitagent run . --adapter lyzr           # Lyzr Studio
```

---

## Why this matters

**For new engineers:** Understand unfamiliar code in seconds instead of hours. No more "what does this even do?" blocking a review.

**For code reviewers:** Tag confusing sections mid-review and get instant context without leaving the PR.

**For test coverage:** Generate test stubs for any file without switching tools or breaking flow.

---

## 100% free to run

| Tool | Free tier |
|---|---|
| **Groq** (Llama 3.3 70B) | ~14,400 req/day on free tier |
| **GitHub Actions** | 2,000 min/month on public repos |
| **GitHub API** | 5,000 req/hour |

Zero cost for a typical engineering team.

---

<div align="center">

Made with coffee and one too many `@gitagent explain` comments

</div>
