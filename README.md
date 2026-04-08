# Code Explainer Bot

A GitAgent that lives in your GitHub repo and responds to `@gitagent` commands
in PR comments. Tag it on any file or function and it explains the code in plain
English — or generates unit tests instantly.

Built for the [GitAgent Hackathon](https://hackculture.dev) by HackCulture.

---

## Demo

On any PR or issue comment, type:

```
@gitagent explain src/auth/token.js#L20-L45
```

The bot replies in-thread:

> ### What this code does
>
> This function validates a JWT token and extracts the user payload. It checks
> the signature against the secret key and throws if the token is expired.
>
> **Key points:**
> - Uses `jsonwebtoken` under the hood — not custom crypto
> - The `ignoreExpiration` flag is intentionally false here
> - Returns a plain JS object, not a class instance
>
> **Watch out for:** If `JWT_SECRET` is undefined in env, this will throw a
> confusing `secretOrPrivateKey` error rather than a missing env error.

Or generate tests:

```
@gitagent test src/utils/format.js
```

---

## Setup (5 minutes)

### 1. Add this repo as a GitHub Actions dependency

Copy `.github/workflows/agent.yml` into your target repository.

### 2. Add secrets

In your repo → Settings → Secrets → Actions, add:

| Secret | Where to get it |
|---|---|
| `GROQ_API_KEY` | (https://console.groq.com/keys) — free tier, no card needed |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions — nothing to do |

### 3. Install the agent (optional local use)

```bash
npm install -g @open-gitagent/gitagent
gitagent validate        # confirm agent.yaml is valid
gitagent info            # see agent summary
```

### 4. Try it

Open a PR, drop a comment with `@gitagent explain <filepath>`, and watch the bot reply.

---

## Commands

| Command | Example | What it does |
|---|---|---|
| `@gitagent explain <file>` | `@gitagent explain src/api.js` | Explains the whole file |
| `@gitagent explain <file>#L<n>-L<m>` | `@gitagent explain src/api.js#L10-L30` | Explains a specific line range |
| `@gitagent test <file>` | `@gitagent test src/utils.js` | Generates unit tests for the file |

---

## Architecture

```
code-explainer-bot/
├── agent.yaml          # gitagent manifest (model, skills, triggers)
├── SOUL.md             # agent identity and communication style
├── RULES.md            # hard constraints
├── index.js            # runtime: parses comments, calls Gemini, posts replies
├── skills/
│   ├── explain-code/   # explain skill definition
│   └── generate-tests/ # test generation skill definition
└── .github/workflows/
    └── agent.yml       # GitHub Actions trigger
```

The agent is framework-agnostic — export to any supported adapter:

```bash
gitagent export --format system-prompt   # plain system prompt
gitagent export --format openai          # OpenAI Agents SDK
gitagent export --format claude-code     # Claude Code
gitagent run . --adapter lyzr            # Lyzr Studio
```

---

## Why this matters

- **Onboarding**: new engineers understand unfamiliar code in seconds instead of hours
- **Code review**: reviewers can tag confusing sections and get instant context
- **Test coverage**: generate test stubs for any file without leaving the PR

---

## Free tier usage

This agent runs entirely on free credits:
- **Groq**: 1000+ tokens/day free 
- **GitHub Actions**: 2,000 free minutes/month on public repos
- **GitHub API**: 5,000 requests/hour with a standard token

Zero cost to run for a typical engineering team.

---

## License

MIT
