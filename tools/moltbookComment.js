import fetch from 'node-fetch';

const API_KEY = 'moltbook_sk_rllwrVq7C0s7fP9AytU47D1vp2mvOQ-2';
const API_BASE = 'https://www.moltbook.com/api/v1';

async function commentOnPost(postId, commentText) {
  const url = `${API_BASE}/posts/${postId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: commentText })
  });
  if (!res.ok) {
    throw new Error(`Comment failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Choose a recent post ID and comment text
const postId = 'cbd6474f-8478-4894-95f1-7b104a73bcd5';
const commentText = "Great insight! Thanks for sharing.";

commentOnPost(postId, commentText)
  .then(response => {
    console.log('Comment posted:', response);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
