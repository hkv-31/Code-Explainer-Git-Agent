import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const EXPLAIN_TRIGGER = "@gitagent explain";
const TEST_TRIGGER = "@gitagent test";

async function fetchFileContent(owner, repo, filePath, ref) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    });
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

function parseComment(body, trigger) {
  // Strip the trigger phrase and clean up
  const after = body.slice(body.indexOf(trigger) + trigger.length).trim();

  // Extract optional line range e.g. src/auth.js#L10-L30
  const match = after.match(/^([^\s#]+)(?:#L(\d+)(?:-L?(\d+))?)?/);
  if (!match) return { filePath: null, startLine: null, endLine: null };

  const filePath = match[1].trim();
  const startLine = match[2] ? parseInt(match[2]) : null;
  const endLine = match[3] ? parseInt(match[3]) : startLine;
  return { filePath, startLine, endLine };
}

function sliceLines(content, start, end) {
  if (!start) return content;
  return content.split("\n").slice(start - 1, end).join("\n");
}

async function callLLM(prompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";
  } catch (err) {
    console.error("LLM call failed:", err);
    return "Sorry, I could not generate a response.";
  }
}

async function postComment(owner, repo, issueNumber, body) {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  } catch (err) {
    console.error("Failed to post comment:", err);
    throw err;
  }
}

async function handleExplain({ owner, repo, issueNumber, commentBody, prRef }) {
  const { filePath, startLine, endLine } = parseComment(commentBody, EXPLAIN_TRIGGER);

  if (!filePath) {
    await postComment(owner, repo, issueNumber,
      "Please specify a file path, e.g. `@gitagent explain src/auth.js#L10-L30`");
    return;
  }

  const raw = await fetchFileContent(owner, repo, filePath, prRef);
  if (!raw) {
    await postComment(owner, repo, issueNumber,
      `Could not read \`${filePath}\`. Make sure the path is correct.`);
    return;
  }

  const snippet = sliceLines(raw, startLine, endLine);
  const lineInfo = startLine ? ` (lines ${startLine}–${endLine || startLine})` : "";

  const prompt = `You are a senior engineer explaining code to a teammate.
Explain what the following code does in plain English. Be concise.
Format your response exactly like this:

### What this code does

[2-4 sentence summary]

**Key points:**
- [point]
- [point]
- [point]

**Watch out for:** [one gotcha or edge case if relevant, otherwise omit this line]

File: ${filePath}${lineInfo}

\`\`\`
${snippet}
\`\`\``;

  const explanation = await callLLM(prompt);
  await postComment(owner, repo, issueNumber, explanation);
}

async function handleTest({ owner, repo, issueNumber, commentBody, prRef }) {
  const { filePath } = parseComment(commentBody, TEST_TRIGGER);

  if (!filePath) {
    await postComment(owner, repo, issueNumber,
      "Please specify a file path, e.g. `@gitagent test src/utils.js`");
    return;
  }

  const raw = await fetchFileContent(owner, repo, filePath, prRef);
  if (!raw) {
    await postComment(owner, repo, issueNumber,
      `Could not read \`${filePath}\`. Make sure the path is correct.`);
    return;
  }

  const ext = filePath.split(".").pop().toLowerCase();
  const langMap = {
    js: "JavaScript with Jest",
    ts: "TypeScript with Jest",
    py: "Python with pytest",
    rb: "Ruby with RSpec",
    go: "Go with testing package",
    java: "Java with JUnit",
    cs: "C# with NUnit",
    php: "PHP with PHPUnit",
    rs: "Rust with built-in test framework",
  };
  const lang = langMap[ext] || ext;

  const prompt = `You are a senior engineer writing unit tests.
Generate minimal, runnable unit tests for the code below.
Use ${lang}. Cover: happy path, edge cases, and error cases.
Format your response exactly like this:

### Generated tests for \`${filePath}\`

Framework: ${lang}

\`\`\`${ext}
[test code here]
\`\`\`

> These are stubs — add mocks for any external dependencies.

Code to test:
\`\`\`
${raw}
\`\`\``;

  const tests = await callLLM(prompt);
  await postComment(owner, repo, issueNumber, tests);
}

export async function run(payload) {
  const body = payload.comment?.body || "";
  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;

  // Works for both issue comments and PR review comments
  const issueNumber =
    payload.issue?.number ||
    payload.pull_request?.number ||
    payload.comment?.pull_request_url?.split("/").pop();

  const prRef =
    payload.pull_request?.head?.sha ||
    payload.repository?.default_branch ||
    "main";

  if (!owner || !repo || !issueNumber) {
    console.error("Missing required fields from payload:", { owner, repo, issueNumber });
    return;
  }

  console.log(`Running on ${owner}/${repo} #${issueNumber}`);

  if (body.includes(EXPLAIN_TRIGGER)) {
    await handleExplain({ owner, repo, issueNumber, commentBody: body, prRef });
  } else if (body.includes(TEST_TRIGGER)) {
    await handleTest({ owner, repo, issueNumber, commentBody: body, prRef });
  }
}