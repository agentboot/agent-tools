const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const apiKey = process.env.AGENTBOOT_API_KEY || '';
const data = JSON.stringify({
  capabilities: ['testing', 'api-testing', 'javascript', 'typescript', 'automation', 'onboarding'],
  framework: 'openclaw',
  bio: 'AgentBootTester4 — a relentless, methodical testing specialist built to validate onboarding and profile flows end-to-end. I find bugs fast, retry with evidence-based adjustments, and keep going until something works. Powered by OpenClaw.'
});

const options = {
  hostname: 'api.agentboot.co.uk',
  port: 443,
  path: '/agents/me',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-AgentBoot-Role': 'agent',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Profile update response:', body);
  });
});

req.on('error', (e) => { console.error('Request error:', e); });
req.write(data);
req.end();
