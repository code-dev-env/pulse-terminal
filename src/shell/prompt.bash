# Pulse Terminal prompt for bash: powerline-style prompt, startup banner, and a `clear` that redraws the banner.
# It is started as `bash --rcfile <this file> -i`, which replaces ~/.bashrc, so the user's own file is loaded first.
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc"

__ct_user=${USER:-$(id -un 2>/dev/null)}
# Nerd Font glyphs as raw UTF-8 bytes, so they don't depend on the locale
__ct_sep=$'\xee\x82\xb0'      # U+E0B0
__ct_ibranch=$'\xee\x82\xa0'  # U+E0A0
__ct_iuser=$'\xef\x80\x87'    # U+F007
__ct_idir=$'\xef\x81\xbc'     # U+F07C
__ct_arrow=$'\xe2\x9d\xaf'    # U+276F
__ct_ellipsis=$'\xe2\x80\xa6' # U+2026

__ct_banner() {
  if [ -n "$CT_BANNER" ] && [ -f "$CT_BANNER" ]; then
    cat "$CT_BANNER"
    rm -f "$CT_BANNER"
  fi
}
__ct_banner

# Clearing the screen redraws the banner. The OSC marker asks the app for a fresh banner file, which is printed
# from here so the shell's own cursor ends up below it.
clear() {
  printf '\e[H\e[2J\e[3J'
  printf '\e]777;ct-banner\a'
  local i
  for ((i = 0; i < 133; i++)); do
    [ -f "$CT_BANNER" ] && break
    sleep 0.015
  done
  __ct_banner
}

# Branch and dirty state come from one git call, and only inside a repo (a .git folder, or file for worktrees, up the tree)
__ct_prompt() {
  local ok=$?
  local cwd=$PWD p=$PWD leaf seg
  if [[ -n $HOME && ( $p == "$HOME" || $p == "$HOME"/* ) ]]; then p="~${p#"$HOME"}"; fi
  local -a raw parts=()
  IFS=/ read -ra raw <<< "$p"
  for seg in "${raw[@]}"; do
    [[ -n $seg ]] && parts+=("$seg")
  done
  if ((${#parts[@]} > 3)); then
    local n=${#parts[@]}
    p="$__ct_ellipsis/${parts[n - 3]}/${parts[n - 2]}/${parts[n - 1]}"
  fi
  leaf=${cwd##*/}
  [[ -z $leaf ]] && leaf=$cwd
  printf '\e]0;%s\a' "$leaf"

  local branch= dirty=0 d=$cwd st l
  while :; do
    if [[ -e $d/.git ]]; then
      st=$(git --no-optional-locks status --porcelain=v2 --branch 2>/dev/null) || st=
      while IFS= read -r l; do
        case $l in
          '# branch.head '*)
            branch=${l#'# branch.head '}
            [[ $branch == '(detached)' ]] && branch=HEAD
            ;;
          '#'*) ;;
          *)
            dirty=1
            break
            ;;
        esac
      done <<< "$st"
      break
    fi
    [[ -z $d ]] && break
    d=${d%/*}
  done

  # dynamic text goes in through variables, never pasted into PS1, so a directory name can't be interpreted as a command
  __ct_dir=$p
  __ct_branch=$branch
  local ps='\[\e[0m\e[30;44m\] ${__ct_iuser} ${__ct_user} \[\e[34;45m\]${__ct_sep}\[\e[30;45m\] ${__ct_idir} ${__ct_dir} '
  local last=5 c col
  if [[ -n $branch ]]; then
    c=2
    ((dirty)) && c=3
    ps+='\[\e[3'$last';4'$c'm\]${__ct_sep}\[\e[30;4'$c'm\] ${__ct_ibranch} ${__ct_branch}'
    ((dirty)) && ps+=' *'
    ps+=' '
    last=$c
  fi
  ps+='\[\e[0;3'$last'm\]${__ct_sep}\[\e[0m\]\n'
  col=31
  ((ok == 0)) && col=32
  ps+='\[\e['$col'm\]${__ct_arrow}\[\e[0m\] '
  PS1=$ps
}
PROMPT_COMMAND="__ct_prompt${PROMPT_COMMAND:+;$PROMPT_COMMAND}"

if [[ $- == *i* ]]; then
  bind 'set enable-bracketed-paste on' 2>/dev/null
  # Alt+Enter (the app also sends it for Shift+Enter): new line without running the command
  bind '"\e\C-m": "\C-v\C-j"' 2>/dev/null
  # Ctrl+L clears and redraws the banner
  bind '"\C-l": "\C-e\C-u clear\C-m"' 2>/dev/null
fi
