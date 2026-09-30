#!/usr/bin/env bash
#
# 把仓库根的旧站静态文件复制到 static/legacy
#
# 为什么复制到 static/legacy 而不是 public/legacy：
#   Hugo 会把 static/ 下的内容原样产出到 public/，
#   所以在 build 之前放好，Hugo 会统一处理，流程更干净；
#   本地 hugo server 也能直接预览到这些文件。
#
# 说明：GitHub Actions 部署时会做同样的事（见 .github/workflows/hugo-pages.yml）。
#
# 用法：
#   bash scripts/copy_legacy.sh
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TARGET="static/legacy"
mkdir -p "$TARGET"

COUNT=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  cp -f "$f" "$TARGET/"
  echo "  复制: $f"
  COUNT=$((COUNT + 1))
done < <(find . -maxdepth 1 -type f \( \
  -iname "*.html" -o -iname "*.htm" \
  -o -iname "*.webp" -o -iname "*.png" \
  -o -iname "*.jpg" -o -iname "*.jpeg" \
  -o -iname "*.gif" -o -iname "*.svg" \
  -o -iname "*.css" -o -iname "*.js" \
  \) -exec basename {} \;)

if [ "$COUNT" -eq 0 ]; then
  echo "仓库根目录没有找到 html / 图片 / css / js 文件，无需复制。"
  echo "（把旧站文件放到仓库根目录后再运行本脚本）"
else
  echo ""
  echo "✅ 已复制 $COUNT 个文件到 $TARGET/"
  echo "   现在运行 hugo server，即可通过 /legacy/xxx 访问"
fi
