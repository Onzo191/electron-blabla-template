#!/usr/bin/env bash
# PreToolUse (Bash): block dangerous or wrong-tool commands.
# Exit 2 => the command is blocked and the stderr message is shown to Claude.
set -u

command -v node >/dev/null 2>&1 || exit 0

cmd=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input?.command??""))}catch{}})')
[ -z "$cmd" ] && exit 0

repo="${CLAUDE_PROJECT_DIR:-$(pwd)}"

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

# --- npm is banned (pnpm is the required package manager) -------------------
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+(install|i|ci|add|update|uninstall|remove)\b'; then
  block "npm is not used in this repo — use pnpm (e.g. 'pnpm install', 'pnpm add <pkg>')."
fi

# --- git push --force --------------------------------------------------------
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+push\b'; then
  # allow --force-with-lease / --force-if-includes; block bare --force / -f
  stripped=$(printf '%s' "$cmd" | sed -E 's/--force-(with-lease|if-includes)[^[:space:]]*//g')
  if printf '%s' "$stripped" | grep -qE '(--force\b|(^|[[:space:]])-[a-zA-Z]*f)'; then
    block "git push --force is not allowed. Use --force-with-lease if you really must rewrite a branch."
  fi
fi

# --- recursive rm outside the repo / scratchpad ------------------------------
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])(sudo[[:space:]]+)?rm[[:space:]]+[^;&|]*'; then
  # only care when both recursive and force flags are present
  if printf '%s' "$cmd" | grep -qE 'rm[[:space:]]+(-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+)*-[a-zA-Z]*[rR]?[a-zA-Z]*' &&
    printf '%s' "$cmd" | grep -qE 'rm[[:space:]]+[^;&|]*(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r[[:space:]]+[^;&|]*-f|-f[[:space:]]+[^;&|]*-r|--recursive[^;&|]*--force|--force[^;&|]*--recursive)'; then
    # extract the argument tokens of the rm command
    args=$(printf '%s' "$cmd" | sed -E 's/.*(^|[;&|])[[:space:]]*(sudo[[:space:]]+)?rm[[:space:]]+//' | sed -E 's/[;&|].*$//')
    for tok in $args; do
      case "$tok" in
        -*) continue ;;
      esac
      case "$tok" in
        "$repo"* | ./* | [a-zA-Z0-9_]* )
          # relative path or inside the repo — allow, unless it climbs out
          case "$tok" in
            *..*) block "rm -rf with a '..' path ('$tok') could escape the repo. Use an absolute path inside $repo." ;;
          esac
          ;;
        /tmp/* | /private/tmp/*) continue ;;
        *) block "rm -rf outside the repository ('$tok') is not allowed." ;;
      esac
    done
  fi
fi

exit 0
