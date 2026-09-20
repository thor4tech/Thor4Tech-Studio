#!/usr/bin/env bash
# Pipeline de extração de conteúdo público para alimentar a brain.
#
# Uso:  ./tools/extract.sh <destino> <url-ou-@handle> [...]
#
# Cookies (contornam bot gate de YouTube/Instagram):
#   export YT_COOKIES=/caminho/cookies-youtube.txt
#   export IG_COOKIES=/caminho/cookies-instagram.txt
# Exporte no formato Netscape com a extensão "Get cookies.txt LOCALLY".
set -euo pipefail

DEST="${1:?uso: extract.sh <destino> <url|@handle> [...]}"; shift
mkdir -p "$DEST"/{raw,processed,logs}

command -v yt-dlp >/dev/null || { echo "yt-dlp ausente: pip install yt-dlp"; exit 1; }

YD=(yt-dlp --no-warnings --skip-download --write-info-json
    --write-auto-sub --write-sub --sub-lang "pt,pt-BR,en" --sub-format vtt
    --sleep-requests 2 --retries 5 --retry-sleep 10)
[[ -n "${YT_COOKIES:-}" ]] && YD+=(--cookies "$YT_COOKIES")

for src in "$@"; do
  case "$src" in
    *instagram.com*) [[ -n "${IG_COOKIES:-}" ]] && YD+=(--cookies "$IG_COOKIES") \
                     || echo "AVISO: Instagram exige IG_COOKIES; provável 302/429." ;;
  esac
  echo "==> $src"
  "${YD[@]}" -o "$DEST/raw/%(id)s.%(ext)s" "$src" 2>&1 | tee -a "$DEST/logs/extract.log" || \
    echo "FALHOU: $src (ver logs)"
done

python3 - "$DEST" <<'PY'
import re, sys, pathlib
d = pathlib.Path(sys.argv[1])
(out := d/'processed').mkdir(exist_ok=True)
for vtt in (d/'raw').glob('*.vtt'):
    lines, seen = [], set()
    for ln in vtt.read_text('utf-8', errors='ignore').splitlines():
        if ln.startswith(('WEBVTT','Kind:','Language:','NOTE')) or '-->' in ln or not ln.strip():
            continue
        s = re.sub(r'<[^>]+>', '', ln).strip()
        if s and s not in seen:
            seen.add(s); lines.append(s)
    txt = []
    for s in lines:                       # colapsa legendas rolantes
        if txt and (s in txt[-1] or txt[-1] in s):
            if len(s) > len(txt[-1]): txt[-1] = s
            continue
        txt.append(s)
    body = ' '.join(txt)
    (out/(vtt.stem.split('.')[0] + '.txt')).write_text(body, encoding='utf-8')
    print(f"{vtt.stem:40} {len(body.split()):>7} palavras")
PY
echo "Pronto: $DEST/processed/"
