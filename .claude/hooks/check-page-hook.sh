#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[[ "$FILE" =~ /page\.tsx$ ]] || exit 0

DIR=$(dirname "$FILE")
HOOK_FOUND=$(find "$DIR" "$DIR/hooks" "$(dirname "$DIR")/hooks" -maxdepth 2 \( -name "use*.ts" -o -name "use*.tsx" \) 2>/dev/null | head -1)

if [ -z "$HOOK_FOUND" ]; then
  jq -n '{
    "decision": "block",
    "reason": "page.tsx written without a custom hook. MANDATORY: create use{Feature}.ts extracting all state, effects, and data fetching before continuing.",
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": "Create the custom hook file now, then page.tsx can be written."
    }
  }'
fi
