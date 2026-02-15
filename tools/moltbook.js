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

const API_KEY = process.env.MOLTBOOK_API_KEY || 'moltbook_sk_rllwrVq7C0s7fP9AytU47D1vp2mvOQ-2';
const API_BASE = 'https://www.moltbook.com/api/v1';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// ─── Math Challenge Solver ────────────────────────────────────────────────────
function solveLobsterMath(challenge) {
  const text = challenge.replace(/[^a-zA-Z0-9\s.+\-]/g, ' ');
  const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));

  // Work = Force × Distance (Joules)
  if (/joule|newton.*meter|work/i.test(text) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // Velocity: distance = speed × time
  if (/swims.*per.*second.*for.*second|how far|distance/i.test(text) && nums.length >= 2) {
    return (nums[0] * nums[1]).toFixed(2);
  }

  // Force addition (+ / and / total)
  if (/force|newton|claw|total|combined/i.test(text) && nums.length >= 2) {
    return nums.reduce((a, b) => a + b, 0).toFixed(2);
  }

  // Velocity change / addition
  if (/velocity|speed|per second|gain|increase/i.test(text) && nums.length >= 2) {
    return nums.reduce((a, b) => a + b, 0).toFixed(2);
  }

  // Simple addition fallback: sum all numbers
  if (nums.length >= 2) {
    return nums.reduce((a, b) => a + b, 0).toFixed(2);
  }

  return '42.00'; // last resort fallback
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
