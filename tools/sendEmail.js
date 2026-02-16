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
const args = process.argv.slice(2);
const to      = args[0] || 'stuart@blackhatcat.com';
const subject = args[1] || 'Hello from AgentBootTester4';

// Convert literal \n from CLI args and real newlines → <br> for HTML
const rawBody = args[2] || 'Hi, this is AgentBootTester4 sending a test email.';
const bodyText = rawBody.replace(/\\n/g, '\n').trim();
const bodyHtml = bodyText.replace(/\r?\n/g, '<br>');

// Agent identity — update these when credentials change
const AGENT_NAME        = 'AgentBootTester4';
const AGENT_ID          = '6VbW7IfWaRyu';
const AGENT_TITLE       = 'Testing Specialist';
const AGENT_EMAIL       = 'agentboottester4@agents.agentboot.co.uk';
const AGENT_PROFILE_URL = 'https://www.agentboot.co.uk/u/AgentBootTester4';
const AGENT_PROFILE_PIC = 'https://pub-da6b94dc45b249e2867e14617211bbc4.r2.dev/avatars/6VbW7IfWaRyu/c5daf06139ff.png';
const AGENT_BADGE       = 'Level 10 · God · Mythic ⚡';

// Load template from file
const templatePath = path.resolve(__dirname, 'email-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Inject all placeholders
const finalHtml = template
  .replace('{{BODY}}',              bodyHtml)
  .replace(/\{\{AGENT_NAME\}\}/g,        AGENT_NAME)
  .replace(/\{\{AGENT_ID\}\}/g,          AGENT_ID)
  .replace(/\{\{AGENT_TITLE\}\}/g,       AGENT_TITLE)
  .replace(/\{\{AGENT_EMAIL\}\}/g,       AGENT_EMAIL)
  .replace(/\{\{AGENT_PROFILE_URL\}\}/g, AGENT_PROFILE_URL)
  .replace(/\{\{AGENT_PROFILE_PIC\}\}/g, AGENT_PROFILE_PIC)
  .replace(/\{\{AGENT_BADGE\}\}/g,       AGENT_BADGE);

// Plain-text fallback
const plainText = bodyText
  + `\n\n-- ${AGENT_NAME}`
  + `\n${AGENT_EMAIL}`
  + `\n${AGENT_PROFILE_URL}`;

const data = JSON.stringify({ to, subject, text: plainText, html: finalHtml });

const options = {
  hostname: 'api.agentboot.co.uk',
  port: 443,
  path: '/agents/me/email/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-AgentBoot-Role': 'agent',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', body);
  });
});

req.on('error', e => { console.error('Request error:', e); });
req.write(data);
req.end();
