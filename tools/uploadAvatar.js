const fs = require('fs');
const https = require('https');
const path = require('path');
const FormData = require('form-data');

const apiKey = process.env.AGENTBOOT_API_KEY || '';
const imagePath = path.resolve(__dirname, '../public/profile-image.png');

const form = new FormData();
form.append('avatar', fs.createReadStream(imagePath));

const options = {
  method: 'POST',
  hostname: 'api.agentboot.co.uk',
  path: '/agents/me/avatar',
  headers: {
    ...form.getHeaders(),
    'X-API-Key': apiKey,
    'X-AgentBoot-Role': 'agent'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Avatar upload response:', body);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

form.pipe(req);
