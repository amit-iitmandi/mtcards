// Never print matching values. Scan tracked source or every reachable Git blob.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const patterns = [
  /mongodb(?:\+srv)?:\/\/[^\s/@]+:[^\s/@]+@/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAIza[\w-]{30,}/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/,
  /^(?:SECRET_OR_KEY|DATABASE_ACCESS|MONGOURI|SENDGRID_API)[ \t]*=[ \t]*["']?[^\s"']+/m,
  /\b(?:api_secret|client_secret|private_key)\s*["']?\s*[:=]\s*["'][^"']{8,}["']/i
];
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const history = process.argv.includes('--history');
let findings = 0;
const check = (name, data) => {
  if (data.includes(0)) return;
  const value = data.toString('utf8');
  if (patterns.some(pattern => pattern.test(value))) { console.error('Potential secret: ' + name); findings++; }
};
if (history) {
  const seen = new Set();
  for (const line of git(['rev-list', '--objects', '--all']).toString().trim().split('\n')) {
    const [sha, ...path] = line.split(' ');
    if (!path.length || seen.has(sha)) continue;
    seen.add(sha);
    if (git(['cat-file', '-t', sha]).toString().trim() === 'blob') check(sha + ' ' + path.join(' '), git(['cat-file', 'blob', sha]));
  }
} else {
  for (const path of git(['ls-files', '-z']).toString().split('\0').filter(Boolean)) {
    if (fs.existsSync(path)) check(path, fs.readFileSync(path));
  }
}
console.log(`Secret scan: ${findings} file/blob findings; values suppressed.`);
process.exitCode = findings ? 1 : 0;
