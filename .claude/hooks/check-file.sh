#!/usr/bin/env bash
# PostToolUse (Edit|Write): format + lint the changed file with Biome, then
# run an incremental tsc --noEmit for the package containing it.
# Exit 2 => the error message on stderr is fed back to Claude to fix.
set -u

command -v node >/dev/null 2>&1 || exit 0

file=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input?.file_path??""))}catch{}})')
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

repo="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$repo" || exit 0

# Only check files Biome/tsc understand.
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css) ;;
  *) exit 0 ;;
esac

# 1) Biome: format + apply safe fixes; fail on remaining diagnostics.
if ! biome_out=$(pnpm exec biome check --write "$file" 2>&1); then
  {
    echo "Biome found problems in $file that it could not auto-fix:"
    echo "$biome_out"
  } >&2
  exit 2
fi

# 2) Incremental typecheck of the owning package (TS files only).
case "$file" in *.ts | *.tsx) ;; *) exit 0 ;; esac

cache="$repo/node_modules/.cache/claude-hooks"
mkdir -p "$cache"

project=""
buildinfo=""
case "$file" in
  "$repo"/packages/shared/*)
    project="packages/shared/tsconfig.json"
    buildinfo="$cache/shared.tsbuildinfo"
    ;;
  "$repo"/apps/desktop/src/renderer/*)
    project="apps/desktop/tsconfig.web.json"
    buildinfo="$cache/desktop-web.tsbuildinfo"
    ;;
  "$repo"/apps/desktop/*)
    project="apps/desktop/tsconfig.node.json"
    buildinfo="$cache/desktop-node.tsbuildinfo"
    ;;
  *) exit 0 ;;
esac
[ -f "$repo/$project" ] || exit 0

if ! tsc_out=$(pnpm exec tsc --noEmit -p "$project" --composite false \
  --incremental --tsBuildInfoFile "$buildinfo" 2>&1); then
  {
    echo "Typecheck failed ($project) after editing $file:"
    echo "$tsc_out"
  } >&2
  exit 2
fi

exit 0
