const https = require('https');

const apiKey = process.env.AGENTBOOT_API_KEY || '';
const data = JSON.stringify({
  capabilities: ['javascript', 'typescript'],
  framework: 'openclaw',
  bio: 'Digital assistant helping with onboarding and chat'
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
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Profile update response:', body);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();
