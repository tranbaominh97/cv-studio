import test from 'node:test';
import assert from 'node:assert/strict';
import { publicFiles, privacyIssues } from '../scripts/prepare-public.mjs';

test('publication policy permits exact reviewed files only', () => {
  assert.deepEqual(publicFiles('*\n!/src/\n!/src/main.jsx\n'), ['src/main.jsx']);
  for (const policy of ['!/src/main.jsx', '*\n!/src/**', '*\n!/../private.md', '*\n!/src/../private.md']) {
    assert.throws(() => publicFiles(policy));
  }
});

test('privacy checks reject personal contacts, local paths and credentials without echoing values', () => {
  assert.deepEqual(privacyIssues('person@example.com'), []);
  assert.deepEqual(privacyIssues(['person', 'mail.invalid'].join('@')), ['non-example email']);
  assert.deepEqual(privacyIssues(['C:', 'Users', 'someone', 'file'].join('\\')), ['personal filesystem path']);
  assert.deepEqual(privacyIssues(['-----BEGIN ', 'PRIVATE KEY-----'].join('')), ['credential']);
  assert.deepEqual(privacyIssues('ghp_' + 'a'.repeat(36)), ['credential']);
});
