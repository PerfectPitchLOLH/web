#!/bin/bash
cd "$CLAUDE_PROJECT_DIR" || exit 0
OUTPUT=$(npm run type-check 2>&1 | tail -40)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  jq -n --arg ctx "$OUTPUT" '{
    "hookSpecificOutput": {
      "hookEventName": "Stop",
      "additionalContext": ("TypeScript errors found — fix before finishing:\n" + $ctx)
    }
  }'
fi
