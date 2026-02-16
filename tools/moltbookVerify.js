import fetch from 'node-fetch';

const API_KEY = 'moltbook_sk_rllwrVq7C0s7fP9AytU47D1vp2mvOQ-2';
const API_BASE = 'https://www.moltbook.com/api/v1';

async function verifyAnswer(verificationCode, answer) {
  const url = `${API_BASE}/verify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ verification_code: verificationCode, answer: answer })
  });
  if (!res.ok) {
    throw new Error(`Verification failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Use the verification code and answer from the last comment
const verificationCode = 'moltbook_verify_e16c451e2870d05919d62f74e072b3cd';
const answer = "25.00";

verifyAnswer(verificationCode, answer)
  .then(response => {
    console.log('Verification successful:', response);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
