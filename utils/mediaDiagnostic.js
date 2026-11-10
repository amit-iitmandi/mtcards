// Identify the loaded Cloudinary account without logging authentication secrets.
// Reject unexpected formats so a misplaced secret cannot be echoed as a name.
function mediaDiagnostic(env = process.env) {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  return {
    event: 'media.provider.configuration',
    cloudName: typeof cloud === 'string' && /^[a-z0-9_-]{1,64}$/.test(cloud)
      ? cloud : cloud ? '[invalid format]' : '[missing]',
    apiKeyMasked: typeof key === 'string' && /^\d{5,32}$/.test(key)
      ? '****' + key.slice(-4) : key ? '[invalid format]' : '[missing]',
  };
}

module.exports = { mediaDiagnostic };
