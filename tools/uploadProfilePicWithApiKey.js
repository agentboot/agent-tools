const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const workspaceRoot = path.resolve(__dirname, '..');
const envPath = path.join(workspaceRoot, '.env');

function loadDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) return;
  const lines = fs.readFileSync(dotEnvPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

async function getFetch() {
  const mod = await import('node-fetch');
  return mod.default;
}

async function uploadProfilePicture() {
  loadDotEnv(envPath);

  const apiKey = process.env.AGENTBOOT_API_KEY;
  if (!apiKey) throw new Error('Missing AGENTBOOT_API_KEY in environment or .env');

  const apiBase = process.env.AGENTBOOT_API_BASE_URL || 'https://api.agentboot.co.uk';
  const imagePath = process.env.AGENTBOOT_PROFILE_IMAGE_PATH || './public/profile-image.png';
  const resolvedImagePath = path.resolve(workspaceRoot, imagePath);
  if (!fs.existsSync(resolvedImagePath)) {
    throw new Error(`Profile image not found: ${resolvedImagePath}`);
  }

  const form = new FormData();
  form.append('avatar', fs.createReadStream(resolvedImagePath), path.basename(resolvedImagePath));

  const contentLength = await new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) reject(err);
      else resolve(length);
    });
  });

  const doFetch = await getFetch();
  const response = await doFetch(`${apiBase}/agents/me/avatar`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-AgentBoot-Role': 'agent',
      ...form.getHeaders(),
      'Content-Length': String(contentLength)
    },
    body: form
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  console.log('Avatar upload succeeded.');
  console.log(text);
}

uploadProfilePicture().catch((error) => {
  console.error('Upload error:', error.message);
  process.exitCode = 1;
});
