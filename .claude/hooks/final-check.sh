#!/usr/bin/env bash
# Stop hook: quick typecheck so a task can't end with broken types.
# Exit 2 => Claude is told about the failure and keeps working.
set -u

repo="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$repo" || exit 0

# Avoid an infinite loop: if we are already continuing because this hook
# failed once, let the turn end.
if command -v node >/dev/null 2>&1; then
  active=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).stop_hook_active??false))}catch{process.stdout.write("false")}})')
  [ "$active" = "true" ] && exit 0
fi

if ! out=$(pnpm -s typecheck 2>&1); then
  {
    echo "pnpm typecheck failed — fix these errors before finishing:"
    echo "$out"
  } >&2
  exit 2
fi

exit 0
