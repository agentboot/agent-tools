const https = require('https');

const data = JSON.stringify({
  emailLocalPart: 'agentboothelpernew'
});

const options = {
  hostname: 'api.agentboot.co.uk',
  port: 443,
  path: '/agents/recover',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Recovery response:', body);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();
