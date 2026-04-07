import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const EXPLAIN_TRIGGER = "@gitagent explain";
const TEST_TRIGGER = "@gitagent test";

async function fetchFileContent(owner, repo, filePath, ref) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath, ref });
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function parseComment(body) {
  const match = body.match(
    /@gitagent\s+(?:explain|test)\s+([^\s#]+)(?:#L(\d+)(?:-L?(\d+))?)?/i
  );

  const filePath = match?.[1] || null;
  const startLine = match?.[2] ? parseInt(match[2]) : null;
  const endLine = match?.[3] ? parseInt(match[3]) : startLine;

  return { filePath, startLine, endLine };
}

function sliceLines(content, start, end) {
  if (!start) return content;
  return content.split("\n").slice(start - 1, end).join("\n");
}

async function callLLM(prompt) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  
  const data = await res.json();
  console.log("GEMINI RESPONSE:", JSON.stringify(data, null, 2));

  return data?.candidates?.[0]?.content?.parts?.[0]?.text
    || data?.candidates?.[0]?.output
    || "Sorry, I couldn't generate a response.";
}

async function postComment(owner, repo, issueNumber, body) {
  await octokit.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function handleExplain({ owner, repo, issueNumber, commentBody, prRef }) {
  const { filePath, startLine, endLine } = parseComment(commentBody);
  if (!filePath) {
    return postComment(owner, repo, issueNumber, "Please specify a file path, e.g. `@gitagent explain src/auth.js#L10-L30`");
  }

  const raw = await fetchFileContent(owner, repo, filePath, prRef);
  if (!raw) {
    return postComment(owner, repo, issueNumber, `Could not read \`${filePath}\`. Make sure the path is correct.`);
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

**Watch out for:** [one gotcha or edge case if relevant, otherwise omit this line]

File: ${filePath}${lineInfo}

\`\`\`
${snippet}
\`\`\``;

  const explanation = await callLLM(prompt);
  await postComment(owner, repo, issueNumber, explanation);
}

async function handleTest({ owner, repo, issueNumber, commentBody, prRef }) {
  const { filePath } = parseComment(commentBody);
  if (!filePath) {
    return postComment(owner, repo, issueNumber, "Please specify a file path, e.g. `@gitagent test src/utils.js`");
  }

  const raw = await fetchFileContent(owner, repo, filePath, prRef);
  if (!raw) {
    return postComment(owner, repo, issueNumber, `Could not read \`${filePath}\`. Make sure the path is correct.`);
  }

  const ext = filePath.split(".").pop();
  const lang = { js: "JavaScript/Jest", ts: "TypeScript/Jest", py: "Python/pytest", rb: "Ruby/RSpec" }[ext] || ext;

  const prompt = `You are a senior engineer writing unit tests.
Generate minimal, runnable unit tests for the code below.
Use ${lang}. Cover: happy path, edge cases, and error cases.
Format your response exactly like this:

### Generated tests for \`${filePath}\`

Framework: ${lang}

\`\`\`${ext}
[test code]
\`\`\`

> These are stubs — add mocks for any external dependencies.

\`\`\`
${raw}
\`\`\``;

  const tests = await callLLM(prompt);
  await postComment(owner, repo, issueNumber, tests);
}

// --- Main entry point (called by GitHub Actions webhook) ---
export async function run(payload) {
  const body = payload.comment?.body || "";
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue?.number || payload.pull_request?.number;
  const prRef = payload.pull_request?.head?.sha || payload.repository.default_branch;

  if (body.includes(EXPLAIN_TRIGGER)) {
    await handleExplain({ owner, repo, issueNumber, commentBody: body, prRef });
  } else if (body.includes(TEST_TRIGGER)) {
    await handleTest({ owner, repo, issueNumber, commentBody: body, prRef });
  }
}
