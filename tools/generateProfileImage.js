const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

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

async function generateProfileImage() {
  loadDotEnv(envPath);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment or .env');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const promptFromArgs = process.argv.slice(2).join(' ').trim();
  const prompt =
    promptFromArgs ||
    process.env.AGENTBOOT_IMAGE_PROMPT ||
    'Futuristic and friendly AI assistant avatar, blue and white palette, clean digital style';

  const size = process.env.AGENTBOOT_IMAGE_SIZE || '1024x1024';
  const quality = process.env.AGENTBOOT_IMAGE_QUALITY || 'auto';
  const outputRel = process.env.AGENTBOOT_PROFILE_IMAGE_PATH || './public/profile-image.png';
  const outputPath = path.resolve(workspaceRoot, outputRel);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size,
    quality
  });

  const imageBase64 = response?.data?.[0]?.b64_json;
  const imageUrl = response?.data?.[0]?.url;

  if (imageBase64) {
    fs.writeFileSync(outputPath, Buffer.from(imageBase64, 'base64'));
    console.log(`Image saved to ${outputPath}`);
    return;
  }

  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Image download failed: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    console.log(`Image saved to ${outputPath}`);
    return;
  }

  throw new Error('No image data returned by the API');
}

generateProfileImage().catch((error) => {
  console.error('Error generating image:', error.message);
  process.exitCode = 1;
});
