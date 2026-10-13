import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export function publicFiles(policy) {
  const rules = policy.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (rules.shift() !== '*') throw new Error('Public policy must deny files by default.');
  const files = [];
  for (const rule of rules) {
    if (!rule.startsWith('!/') || /[\\*?\[\]]/.test(rule) || rule.slice(2).split('/').some(part => part === '.' || part === '..')) {
      throw new Error('Only exact root-relative public paths are allowed.');
    }
    if (!rule.endsWith('/')) files.push(rule.slice(2));
  }
  return files;
}

export function privacyIssues(text) {
  const issues = [];
  const emails = text.match(/[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
  // Public maintainer contact in npm dependency metadata, not CV data.
  if (emails.some(email => email !== 'i@izs.me' && !/@example\.(com|org|net)$/i.test(email))) issues.push('non-example email');
  if (/(?:[A-Z]:[\\/](?:Users|Documents and Settings)[\\/]|\/(?:Users|home)\/)[\w.-]+/i.test(text)) issues.push('personal filesystem path');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[A-Z0-9]{16}\b/.test(text)) issues.push('credential');
  return issues;
}

async function prepare() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = publicFiles(await fs.readFile(path.join(root, '.gitignore'), 'utf8'));
  // Once Git exists, .gitignore alone cannot protect previously tracked files.
  try {
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
    if (tracked.some(file => !files.includes(file))) throw new Error('Tracked files exist outside the public allowlist. Review locally before publishing.');
  } catch (error) {
    if (!error.stderr?.toString().includes('not a git repository')) throw error;
  }
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const stat = await fs.lstat(path.join(root, ...parts.slice(0, i)));
      if (stat.isSymbolicLink()) throw new Error(`Public path must not be a symlink: ${file}`);
      if (i === parts.length && !stat.isFile()) throw new Error(`Public path is not a file: ${file}`);
    }
    if (!/\.(png|ico)$/.test(file)) {
      const issues = privacyIssues(await fs.readFile(path.join(root, file), 'utf8'));
      if (issues.length) throw new Error(`${file}: ${issues.join(', ')}. Review locally; values are not printed.`);
    }
  }
  console.log(`PASS: ${files.length} explicitly allowed files; basic privacy checks passed. Manual content review is still required.`);
  if (process.argv.includes('--export')) {
    const parent = path.join(root, 'output');
    await fs.mkdir(parent, { recursive: true });
    const destination = await fs.mkdtemp(path.join(parent, 'public-source-'));
    for (const file of files) {
      const target = path.join(destination, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(path.join(root, file), target, fs.constants.COPYFILE_EXCL);
    }
    console.log(`Clean source copy: ${destination}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
}
