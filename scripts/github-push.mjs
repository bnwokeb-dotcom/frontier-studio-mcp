// scripts/github-push.mjs — Automated GitHub push utility for agents.
// Reads the canonical token at C:\Users\hp\.gh-token.txt or uses Windows Git Credential Manager.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const TOKEN_PATH = 'C:/Users/hp/.gh-token.txt';
const REMOTE_REPO = 'https://github.com/bnwokeb-dotcom/frontier-studio-mcp.git';

console.log('[frontier-studio-mcp] Synchronizing repository to GitHub...');

let pushUrl = REMOTE_REPO;
if (existsSync(TOKEN_PATH)) {
  const token = readFileSync(TOKEN_PATH, 'utf8').trim();
  if (token) {
    pushUrl = `https://bnwokeb-dotcom:${token}@github.com/bnwokeb-dotcom/frontier-studio-mcp.git`;
  }
}

try {
  execFileSync('git', ['push', pushUrl, 'main', '--tags'], { stdio: 'inherit' });
  console.log('[OK] Successfully pushed main and release tags to bnwokeb-dotcom/frontier-studio-mcp.');
} catch (err) {
  console.error('[FAIL] Git push failed:', err.message);
  process.exit(1);
}
