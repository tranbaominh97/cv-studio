import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, defaultLayout, validFilename } from '../desktop/store.mjs';
import { parseMarkdown, serializeCV } from '../desktop/markdown.mjs';
import { orderedSections } from '../src/features/cv-editor/sectionOrder.js';
import { createCoverLetter } from '../src/features/cv-editor/coverLetter.js';
import { createCVDocument, getTemplate, letterLayout, templates } from '../src/features/cv-editor/templates.js';

const raw = '# Nguyễn Test\ntest@example.com\n\nOperations Manager\nA complete summary.\n\n---\n\n## CORE COMPETENCIES\n\nPlanning · Communication\n\n## WORK EXPERIENCE\n\n### Manager — Example Company\n**2020 - Present | Ho Chi Minh City**\n\n- Managed **operations** without losing content.\n\n## EDUCATION\n\n**Bachelor**\nUniversity | 2014 - 2018\n\n## SKILLS\n\n- Excel\n- **Languages:** Vietnamese: native\n';

test('new templates keep Markdown and source CV intact; fresh content and letters are independent', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-studio-templates-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'source.md'), raw);
  const store = createStore(directory);
  const source = await store.load('source.md');
  assert.equal(getTemplate(source.layout.templateId).id, 'minimal');
  for (const template of templates) {
    const copy = createCVDocument(source, template.id);
    assert.deepEqual(copy.data, source.data);
    await store.save(`${template.id}.md`, copy.data, copy.layout, null, true);
    const loaded = await store.load(`${template.id}.md`);
    assert.equal(loaded.layout.templateId, template.id);
    assert.deepEqual(loaded.data, source.data);
    assert.equal(await fs.readFile(path.join(directory, `${template.id}.md`), 'utf8'), serializeCV(source.data));
    copy.data.sections['WORK EXPERIENCE'][0].role = 'Changed in copy';
    assert.equal(source.data.sections['WORK EXPERIENCE'][0].role, 'Manager');
  }
  assert.equal(await fs.readFile(path.join(directory, 'source.md'), 'utf8'), raw);
  assert.deepEqual((await store.load('source.md')).layout, defaultLayout);
  const blank = createCVDocument(null, 'portrait');
  assert.equal(blank.data.summary, '');
  assert.deepEqual(blank.data.sections['WORK EXPERIENCE'], []);
  assert.equal(blank.layout.photo, undefined);
  assert.deepEqual(letterLayout({ ...defaultLayout, templateId: 'modern', photo: 'CV-only photo' }), defaultLayout);
  assert.throws(() => createCVDocument({ data: createCoverLetter(source.data) }, 'minimal'), /CV/);
  assert.throws(() => createCVDocument(null, 'missing'), /Mẫu CV/);
  for (const appearance of [{ templateId: 'missing' }, { photo: 'https://example.com/photo.jpg' }, { photo: 'data:image/svg+xml,<svg />' }, { photo: {} }, { photo: 'data:image/jpeg;base64,/9j/' + 'A'.repeat(2_000_000) }]) {
    await assert.rejects(store.save('invalid.md', source.data, { ...defaultLayout, ...appearance }, null, true), /không hợp lệ/);
  }
  assert.equal((await store.list()).includes('invalid.md'), false);
  const current = await store.load('modern.md');
  await fs.writeFile(path.join(directory, '.cv-studio', 'modern.md.json'), JSON.stringify({ ...current.layout, templateId: 'bold' }));
  await assert.rejects(store.save('modern.md', current.data, current.layout, current.revision), /bên ngoài/);
});

test('sample CVs survive parse / serialize / parse with section order intact', async () => {
  const files = (await fs.readdir('examples')).filter(name => name.endsWith('.md'));
  assert.ok(files.length >= 1);
  for (const file of files) {
    const parsed = parseMarkdown(await fs.readFile(path.join('examples', file), 'utf8'));
    assert.deepEqual(parseMarkdown(serializeCV(parsed)), parsed, file);
  }
});

test('reject path traversal and Windows reserved names', () => {
  for (const name of ['../x', '..\\x', 'C:\\cv', 'CON', 'nul.md', 'bad:name', 'a/b', 'x.', '', 'LPT1.md']) assert.throws(() => validFilename(name), name);
  assert.equal(validFilename('CV Nguyễn - SHB'), 'CV Nguyễn - SHB.md');
});

test('every CV places Core Competencies directly after Education and before Languages & Tools without changing data', async () => {
  const files = (await fs.readdir('examples')).filter(name => name.endsWith('.md'));
  for (const file of files) {
    const { sections } = parseMarkdown(await fs.readFile(path.join('examples', file), 'utf8'));
    const before = JSON.stringify(sections);
    const entries = orderedSections(sections);
    const names = entries.map(([name]) => name);
    assert.equal(names.indexOf('CORE COMPETENCIES'), names.indexOf('EDUCATION') + 1, file);
    assert.ok(names.indexOf('CORE COMPETENCIES') < names.indexOf('LANGUAGES & TOOLS'), file);
    assert.equal(JSON.stringify(sections), before, file);
    for (const [name, content] of entries) assert.equal(content, sections[name]);
  }
  assert.deepEqual(orderedSections({ EDUCATION: [], SKILLS: [] }).map(([name]) => name), ['EDUCATION', 'SKILLS']);
  assert.deepEqual(orderedSections({ 'CORE COMPETENCY': [], EDUCATION: [], LANGUAGES: [] }).map(([name]) => name), ['EDUCATION', 'CORE COMPETENCY', 'LANGUAGES']);
  assert.deepEqual(orderedSections({ 'CORE COMPETENCIES': [], 'WORK EXPERIENCE': [], 'LANGUAGES & TOOLS': [] }).map(([name]) => name), ['WORK EXPERIENCE', 'CORE COMPETENCIES', 'LANGUAGES & TOOLS']);
});

test('safe saves, first-version backup, stale revisions, duplicate protection and layout persistence', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-studio-store-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'first.md'), raw);
  const store = createStore(directory);
  const first = await store.load('first.md');
  const data = { ...first.data, summary: 'Edited summary with tiếng Việt.' };
  const layout = { ...defaultLayout, margin: 12 };
  await store.save('first.md', data, layout, first.revision);
  const saved = await store.load('first.md');
  assert.deepEqual(saved.data, data);
  assert.deepEqual(saved.layout, layout);
  assert.equal(await fs.readFile(path.join(directory, '.cv-studio/originals/first.md'), 'utf8'), raw);
  await assert.rejects(store.save('first.md', first.data, layout, first.revision), /bên ngoài/);
  await assert.rejects(store.save('first.md', first.data, layout, null, true), /đã có/);
  await store.save('copy.md', data, layout, null, true);
  assert.deepEqual(await store.list(), ['copy.md', 'first.md']);
  assert.equal((await store.load('first.md')).data.summary, data.summary);
  await fs.writeFile(path.join(directory, 'first.md'), raw + '\n## EXTERNAL\nCodex change\n');
  await assert.rejects(store.save('first.md', data, layout, saved.revision), /bên ngoài/);
  assert.match(await fs.readFile(path.join(directory, 'first.md'), 'utf8'), /Codex change/);
  await assert.rejects(store.save('bad.md', data, { ...layout, fontSize: 0 }, null, true), /giới hạn/);
  assert.equal((await store.list()).includes('bad.md'), false);
});

test('concurrent saves cannot silently overwrite a newer revision', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-studio-queue-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, 'test.md'), raw);
  const store = createStore(directory);
  const doc = await store.load('test.md');
  const results = await Promise.allSettled([
    store.save('test.md', { ...doc.data, summary: 'First' }, doc.layout, doc.revision),
    store.save('test.md', { ...doc.data, summary: 'Second' }, doc.layout, doc.revision),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal((await store.load('test.md')).data.summary, 'First');
});

test('Cover Letters preserve paragraphs, formatting and separate lists with the same safe storage', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-studio-letter-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createStore(directory);
  const cv = parseMarkdown(raw);
  const letter = createCoverLetter(cv);
  assert.equal(letter.name, cv.name);
  assert.equal(letter.contact, cv.contact);
  letter.body = 'Đoạn đầu **in đậm**, *in nghiêng*.\n\nĐoạn hai.\n## NAME\nKhông phải tên\n\\Giữ dấu gạch\n\n';
  letter.recipient = '';
  assert.deepEqual(parseMarkdown(serializeCV(letter)), letter);
  const layout = { ...defaultLayout, margin: 13, fontSize: 12.5 };
  await store.save('cv.md', cv, layout, null, true);
  await store.save('letter.md', letter, layout, null, true);
  assert.deepEqual(await store.list(), ['cv.md']);
  assert.deepEqual(await store.list('cover-letter'), ['letter.md']);
  const saved = await store.load('letter.md');
  assert.deepEqual(saved.data, letter);
  assert.deepEqual(saved.layout, layout);
  await store.save('letter.md', { ...letter, subject: 'New role' }, layout, saved.revision);
  await assert.rejects(store.save('letter.md', letter, layout, saved.revision), /bên ngoài/);
  await assert.rejects(store.save('cv.md', letter, layout, null, true), /đã có/);
  await assert.rejects(store.save('bad.md', { ...letter, body: null }, layout, null, true), /không hợp lệ/);
  await assert.rejects(store.save('bad.md', letter, { ...layout, margin: 0 }, null, true), /giới hạn/);
  assert.deepEqual((await store.load('cv.md')).data, cv);
});
