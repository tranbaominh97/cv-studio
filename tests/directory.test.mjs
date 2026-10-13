import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDataDirectory } from '../desktop/directory.mjs';

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-directory-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, userData: path.join(root, 'profile'), legacy: path.join(root, 'portable', 'data', 'cvs') };
}

test('new users keep the same data directory after moving the executable', async t => {
  const { root, userData, legacy } = await setup(t);
  const first = await resolveDataDirectory(userData, legacy);
  assert.equal(first, path.join(userData, 'data', 'cvs'));
  assert.equal(await resolveDataDirectory(userData, path.join(root, 'moved')), first);
});

test('existing portable CVs stay untouched and their location is remembered', async t => {
  const { root, userData, legacy } = await setup(t);
  await fs.mkdir(legacy, { recursive: true });
  await fs.writeFile(path.join(legacy, 'cv.md'), '# Example Person');
  assert.equal(await resolveDataDirectory(userData, legacy), legacy);
  assert.equal(await resolveDataDirectory(userData, path.join(root, 'moved')), legacy);
  assert.equal(await fs.readFile(path.join(legacy, 'cv.md'), 'utf8'), '# Example Person');
});

test('a previously selected folder is preserved', async t => {
  const { root, userData, legacy } = await setup(t);
  const directory = path.join(root, 'chosen');
  await fs.mkdir(userData);
  await fs.writeFile(path.join(userData, 'settings.json'), JSON.stringify({ directory }));
  assert.equal(await resolveDataDirectory(userData, legacy), directory);
});

test('invalid settings are reported instead of silently hiding existing CVs', async t => {
  const { userData, legacy } = await setup(t);
  await fs.mkdir(userData);
  const settings = path.join(userData, 'settings.json');
  for (const content of ['broken', JSON.stringify({ directory: '' })]) {
    await fs.writeFile(settings, content);
    await assert.rejects(resolveDataDirectory(userData, legacy));
    assert.equal(await fs.readFile(settings, 'utf8'), content);
  }
});
