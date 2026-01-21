#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8090}"
ADMIN_TOKEN="${ADMIN_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjkzMjI5MjMsInVzZXJfaWQiOjF9.5u2V6qg-TtvAXfRbiqhIfulD6h89NQFX-19HAxq5Bpk}"
API_KEY="${API_KEY:-ah-8f4489e271ba00a4d10da973f336d939eb4ba146cb4607f54e09ae1f43f245b2}"
API_KEY_ID="${API_KEY_ID:-gid://axonhub/APIKey/6}"
MODEL="${MODEL:-deepseek-chat}"
TEST_CONTENT="${TEST_CONTENT:-test sensitive word: 傻逼}"

if [[ -z "$ADMIN_TOKEN" || -z "$API_KEY" || -z "$API_KEY_ID" ]]; then
  echo "Missing required env vars. Set ADMIN_TOKEN, API_KEY, API_KEY_ID." >&2
  exit 1
fi

echo "==> Disable content safety intercept for API key"
curl -sS "$BASE_URL/admin/graphql" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateAPIKey($id: ID!, $input: UpdateAPIKeyInput!) { updateAPIKey(id: $id, input: $input) { id contentSafetyInterceptEnabled } }",
    "variables": {
      "id": "'"$API_KEY_ID"'",
      "input": { "contentSafetyInterceptEnabled": false }
    }
  }' | sed -n '1,200p'

echo "==> Call /v1/chat/completions (should not be blocked)"
curl -sS "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$MODEL"'",
    "messages": [{"role": "user", "content": "'"$TEST_CONTENT"'"}]
  }' | sed -n '1,200p'

echo "==> Call /admin/playground/chat (should not be blocked)"
curl -sS "$BASE_URL/admin/playground/chat" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$MODEL"'",
    "messages": [{"role": "user", "content": "'"$TEST_CONTENT"'"}]
  }' | sed -n '1,200p'

echo "Done."
