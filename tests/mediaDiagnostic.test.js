const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mediaDiagnostic } = require('../utils/mediaDiagnostic');

test('diagnostic identifies the account and masks the key without reading the secret', () => {
  const env = { CLOUDINARY_CLOUD_NAME: 'example-cloud', CLOUDINARY_API_KEY: '123456789012345' };
  Object.defineProperty(env, 'CLOUDINARY_API_SECRET', { get() { throw Error('Secret accessed'); } });
  assert.deepEqual(mediaDiagnostic(env), {
    event: 'media.provider.configuration', cloudName: 'example-cloud', apiKeyMasked: '****2345',
  });
});

test('unexpected values and short keys are never echoed into logs', () => {
  for (const value of ['1234', ' secret value ', 'secret\nforged log', 'https://example.com', {}, null]) {
    const result = mediaDiagnostic({ CLOUDINARY_CLOUD_NAME: value, CLOUDINARY_API_KEY: value });
    assert.ok(['[missing]', '[invalid format]'].includes(result.apiKeyMasked));
    if (value !== '1234') assert.ok(['[missing]', '[invalid format]'].includes(result.cloudName));
  }
  assert.deepEqual(mediaDiagnostic({}), {
    event: 'media.provider.configuration', cloudName: '[missing]', apiKeyMasked: '[missing]',
  });
});
