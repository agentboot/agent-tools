/**
 * Moltbook All-in-One Agent Script
 * ===================================
 * File: tools/moltbook.js
 *
 * Usage:
 *   node tools/moltbook.js post "Your post title" "Your post content" [submolt]
 *   node tools/moltbook.js comment <postId> "Your comment text"
 *   node tools/moltbook.js upvote <postId>
 *   node tools/moltbook.js posts [limit]
 *   node tools/moltbook.js submolt create "name" "description"
 *
 * Requires: MOLTBOOK_API_KEY in .env or pass directly via env var
 * Install:  npm install node-fetch dotenv (if not already present)
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
config();

const API_KEY = process.env.MOLTBOOK_API_KEY;
if (!API_KEY) { console.error('❌ MOLTBOOK_API_KEY not set in .env'); process.exit(1); }
const API_BASE = 'https://www.moltbook.com/api/v1';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// ─── Math Challenge Solver ────────────────────────────────────────────────────
function solveLobsterMath(challenge) {
  // Step 1: De-obfuscate — preserve * and x as multiply signals, then remove other non-alpha/digit chars
  const hasMultiply = /\*|times|multiply|\bx\b/i.test(challenge);
  const text = challenge.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Word-to-number map
  const wordNums = {
    zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,
    eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,
    seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000
  };

  // Extract numeric values — both digit-based and word-based
  let nums = [];

  // First try digit extraction
  const digitNums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));
  nums = digitNums;

  // If no digits found, try word numbers
  if (nums.length === 0) {
    const words = text.split(/\s+/);
    let current = 0;
    let wordNumList = [];
    let inNum = false;
    for (const w of words) {
      if (wordNums[w] !== undefined) {
        if (wordNums[w] >= 100) {
          current = (current || 1) * wordNums[w];
        } else if (wordNums[w] >= 20) {
          current += wordNums[w];
        } else {
          current += wordNums[w];
        }
        inNum = true;
      } else if (inNum) {
        wordNumList.push(current);
        current = 0;
        inNum = false;
      }
    }
    if (inNum) wordNumList.push(current);
    nums = wordNumList;
  }

  // If still nothing, try mixed: some digits, some words
  if (nums.length < 2) {
    const allNums = [];
    const words = text.split(/\s+/);
    let current = 0;
    let inNum = false;
    for (const w of words) {
      const d = parseFloat(w);
      if (!isNaN(d)) {
        if (inNum) allNums.push(current);
        allNums.push(d);
        current = 0;
        inNum = false;
      } else if (wordNums[w] !== undefined) {
        if (wordNums[w] >= 100) {
          current = (current || 1) * wordNums[w];
        } else if (wordNums[w] >= 20) {
          current += wordNums[w];
        } else {
          current += wordNums[w];
        }
        inNum = true;
      } else if (inNum) {
        allNums.push(current);
        current = 0;
        inNum = false;
      }
    }
    if (inNum) allNums.push(current);
    if (allNums.length >= nums.length) nums = allNums;
  }

  if (nums.length === 0) return '0.00';

  // Work = Force × Distance (Joules)
  if (/joule|work|newton.*meter|meter.*newton/.test(text) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // Velocity: distance = speed × time
  if (/how far|distance|swims.*second|travels.*second/.test(text) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // "N * M claw force measures" pattern — explicit multiplication
  if (hasMultiply && /claw|force|measure/.test(text) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // Multiplication signals
  if ((hasMultiply || /times|multiply|product/.test(text)) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // Addition / total force — default for lobster claw/force/newton/velocity problems
  return nums.reduce((a, b) => a + b, 0).toFixed(2);
}

// ─── API Helpers ──────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} - ${JSON.stringify(json)}`);
  return json;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} - ${JSON.stringify(json)}`);
  return json;
}

// ─── Verification ─────────────────────────────────────────────────────────────
async function verify(verification) {
  const { code, challenge, expires_at } = verification;
  console.log(`\n🔢 Challenge: ${challenge}`);
  const answer = solveLobsterMath(challenge);
  console.log(`💡 Answer: ${answer} (expires: ${expires_at})`);

  const result = await apiPost('/verify', {
    verification_code: code,
    answer: answer
  });
  console.log(`✅ Verification: ${result.message}`);
  return result;
}

// ─── Commands ─────────────────────────────────────────────────────────────────
async function createPost(title, content, submolt = 'general') {
  console.log(`\n📝 Creating post in m/${submolt}...`);
  const result = await apiPost('/posts', { submolt, title, content });
  console.log(`📌 Post created: ${result.post?.url}`);
  if (result.verification_required) {
    await verify(result.verification);
  }
  return result;
}

async function createComment(postId, content) {
  console.log(`\n💬 Commenting on post ${postId}...`);
  const result = await apiPost(`/posts/${postId}/comments`, { content });
  console.log(`📌 Comment created: ${result.comment?.id}`);
  if (result.verification_required) {
    await verify(result.verification);
  }
  return result;
}

async function upvotePost(postId) {
  console.log(`\n⬆️  Upvoting post ${postId}...`);
  const result = await apiPost(`/posts/${postId}/vote`, { vote: 'up' });
  console.log(`✅ Upvoted: ${JSON.stringify(result)}`);
  return result;
}

async function getPosts(limit = 10) {
  console.log(`\n📰 Fetching top ${limit} posts...`);
  const result = await apiGet(`/posts?limit=${limit}&sort=hot`);
  result.posts?.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}] ${p.title} (↑${p.upvotes})`);
  });
  return result;
}

async function createSubmolt(name, description) {
  console.log(`\n🏘️  Creating submolt m/${name}...`);
  // Try common submolt creation endpoints
  const endpoints = ['/submolts', '/m', '/communities', '/molts'];
  for (const ep of endpoints) {
    try {
      const result = await apiPost(ep, { name, description });
      console.log(`✅ Submolt created: ${JSON.stringify(result)}`);
      return result;
    } catch (e) {
      console.log(`  ❌ ${ep}: ${e.message}`);
    }
  }
  throw new Error('Could not find a working submolt creation endpoint.');
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv;

(async () => {
  try {
    switch (cmd) {
      case 'post':
        await createPost(args[0], args[1], args[2]);
        break;
      case 'comment':
        await createComment(args[0], args[1]);
        break;
      case 'upvote':
        await upvotePost(args[0]);
        break;
      case 'posts':
        await getPosts(parseInt(args[0]) || 10);
        break;
      case 'submolt':
        if (args[0] === 'create') await createSubmolt(args[1], args[2]);
        break;
      default:
        console.log(`
Moltbook Agent CLI
------------------
  node tools/moltbook.js post "Title" "Content" [submolt]
  node tools/moltbook.js comment <postId> "Comment text"
  node tools/moltbook.js upvote <postId>
  node tools/moltbook.js posts [limit]
  node tools/moltbook.js submolt create "name" "description"
        `);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
})();
