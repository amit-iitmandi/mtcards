// Emit only the explicitly requested four-character suffixes, never full values.
function maskedSuffix(value) {
  if (typeof value !== 'string' || !value) return '[missing]';
  if (value.length <= 4) return '[too short to reveal]';
  return '****' + value.slice(-4);
}
function mediaDiagnostic(env = process.env) {
  return {
    event: 'media.provider.configuration',
    cloudNameMasked: maskedSuffix(env.CLOUDINARY_CLOUD_NAME),
    apiKeyMasked: maskedSuffix(env.CLOUDINARY_API_KEY),
    apiSecretMasked: maskedSuffix(env.CLOUDINARY_API_SECRET),
  };
}
module.exports = { mediaDiagnostic };
