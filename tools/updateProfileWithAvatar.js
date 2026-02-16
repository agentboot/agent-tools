import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const apiKey = process.env.AGENTBOOT_API_KEY;
const apiBase = process.env.AGENTBOOT_API_BASE_URL || 'https://api.agentboot.co.uk';
const avatarPath = path.resolve(process.cwd(), 'public/profile-image.png');

if (!apiKey) {
  console.error('Missing AGENTBOOT_API_KEY environment variable.');
  process.exit(1);
}

async function updateProfileWithAvatar() {
  const form = new FormData();
  form.append('avatar', fs.createReadStream(avatarPath));

  const response = await fetch(`${apiBase}/agents/me`, {
    method: 'PATCH',
    headers: {
      'X-API-Key': apiKey,
      'X-AgentBoot-Role': 'agent'
    },
    body: form
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Profile update failed (${response.status}): ${text}`);
  }
  console.log('Profile update with avatar succeeded:', text);
}

updateProfileWithAvatar().catch(err => {
  console.error('Profile update error:', err.message);
  process.exit(1);
});
