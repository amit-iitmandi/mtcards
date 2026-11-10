const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mediaDiagnostic } = require('../utils/mediaDiagnostic');

test('logs only the requested last four characters of each setting', () => {
  const env = { CLOUDINARY_CLOUD_NAME: 'example-cloud', CLOUDINARY_API_KEY: '123456789012345', CLOUDINARY_API_SECRET: 'example-private-secret' };
  const result = mediaDiagnostic(env);
  assert.deepEqual(result, {
    event: 'media.provider.configuration', cloudNameMasked: '****loud',
    apiKeyMasked: '****2345', apiSecretMasked: '****cret',
  });
  for (const value of Object.values(env)) assert.ok(!JSON.stringify(result).includes(value));
});

test('does not reveal entire short, missing or non-string values', () => {
  for (const value of [undefined, null, {}, '', 'abcd', '123']) {
    const result = mediaDiagnostic({ CLOUDINARY_CLOUD_NAME: value, CLOUDINARY_API_KEY: value, CLOUDINARY_API_SECRET: value });
    for (const key of ['cloudNameMasked', 'apiKeyMasked', 'apiSecretMasked']) {
      assert.ok(['[missing]', '[too short to reveal]'].includes(result[key]));
    }
  }
});

test('serialized log safely escapes control characters in suffixes', () => {
  const line = JSON.stringify(mediaDiagnostic({ CLOUDINARY_API_SECRET: 'prefix\nabc' }));
  assert.ok(!line.includes('\n'));
  assert.equal(JSON.parse(line).apiSecretMasked, '****\nabc');
});
