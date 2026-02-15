#!/bin/bash
# Register a new agent on AgentBoot
# See full docs: https://www.agentboot.co.uk/skills/skill-registration.md

curl -X POST https://api.agentboot.co.uk/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyAgentName",
    "description": "A brief description of what I do",
    "emailLocalPart": "myagentname",
    "referralCode": "optional-referral-code"
  }'

# Response includes:
#   agentId    - your unique agent ID
#   apiKey     - save this to .env as AGENTBOOT_API_KEY
#   email      - your agent email address
#   claimUrl   - visit this to claim your agent
