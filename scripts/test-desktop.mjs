import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import electron from 'electron';

await fs.mkdir('tmp', { recursive: true });
const directory = await fs.mkdtemp(path.resolve('tmp', 'desktop-smoke-'));
const fixture = process.argv[3] ? await fs.readFile(process.argv[3], 'utf8') : '# Test Person\ntest@example.com • Ho Chi Minh City\n\nOperations Manager\nA concise summary for desktop verification.\n\n---\n\n## CORE COMPETENCIES\nPlanning · Reporting · Communication\n\n## WORK EXPERIENCE\n\n### Manager — Example Company\n**2020 - Present | Ho Chi Minh City**\n\n- Managed operations and verified office workflow.\n- Prepared reports for stakeholder communication.\n\n## EDUCATION\n\n**Bachelor of Business**\nExample University | 2014 - 2018\n\n## SKILLS\n\n- Excel and Microsoft Office\n';
await fs.writeFile(path.join(directory, 'a.md'), fixture);
await fs.writeFile(path.join(directory, 'b.md'), fixture.replace('Test Person', 'Second CV'));
if (process.argv[4]) {
  const layout = JSON.parse(process.argv[4]);
  await fs.mkdir(path.join(directory, '.cv-studio'));
  for (const name of ['a.md', 'b.md']) await fs.writeFile(path.join(directory, '.cv-studio', `${name}.json`), JSON.stringify(layout));
}
const env = { ...process.env, CV_STUDIO_TEST_DIR: directory };
delete env.ELECTRON_RUN_AS_NODE;
console.log(`Native desktop test outputs: ${directory}`);
const executable = path.resolve(process.argv[2] || electron);
const child = spawn(executable, executable === path.resolve(electron) ? ['.'] : [], { env, stdio: 'inherit', windowsHide: true });
const timeout = setTimeout(() => { child.kill(); console.error('Desktop test timed out.'); process.exitCode = 1; }, 90000);
child.on('error', error => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('exit', async code => {
  clearTimeout(timeout);
  process.exitCode = code || process.exitCode || 0;
  if (process.exitCode) return;
  try {
    for (const file of ['one-page.pdf', 'overflow.pdf', 'cover-letter.pdf', 'cover-letter-preview.png', 'editor.png', 'preview.png']) await fs.access(path.join(directory, file));
    if (!(await fs.readFile(path.join(directory, 'a.md'), 'utf8')).startsWith('# Saved on close')) throw new Error('Save-on-close verification failed.');
    console.log('PASS: executable completed the full smoke test and saved its outputs.');
  } catch (error) { console.error(error); process.exitCode = 1; }
});
