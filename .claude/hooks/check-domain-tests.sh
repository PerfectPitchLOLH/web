#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[[ "$FILE" =~ server/domains/([^/]+)/[^/]+\.(service|repository)\.ts$ ]] || exit 0

DOMAIN="${BASH_REMATCH[1]}"
TESTS_DIR="$(dirname "$FILE")/__tests__"

if [ ! -d "$TESTS_DIR" ] || ! ls "$TESTS_DIR"/*.test.ts &>/dev/null; then
  jq -n \
    --arg domain "$DOMAIN" \
    --arg tests_dir "$TESTS_DIR" \
    '{
      "decision": "block",
      "reason": ("Domain '" + $domain + "' service/repository created without tests. MANDATORY: create test file at " + $tests_dir + "/" + $domain + ".service.test.ts"),
      "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": "Tests are MANDATORY for all domain services and repositories. Create the test file now before continuing."
      }
    }'
fi
