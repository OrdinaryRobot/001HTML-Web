#!/usr/bin/env bash
#
# 把仓库根的静态 html / 图片复制到 static/legacy，方便本地 hugo server 预览
#
# 用法：
#   bash scripts/copy_legacy.sh
#
set -euo pipefail

# 定位仓库根
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TARGET="static/legacy"
mkdir -p "$TARGET"

COUNT=0
# 复制根目录的 html / 图片（不递归，只看仓库根）
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
  \) -printf '%P\n' 2>/dev/null || find . -maxdepth 1 -type f \( \
  -iname "*.html" -o -iname "*.htm" \
  -o -iname "*.webp" -o -iname "*.png" \
  -o -iname "*.jpg" -o -iname "*.jpeg" \
  -o -iname "*.gif" -o -iname "*.svg" \
  \) -exec basename {} \;)

if [ "$COUNT" -eq 0 ]; then
  echo "仓库根目录没有找到 html / 图片文件，无需复制。"
else
  echo ""
  echo "✅ 已复制 $COUNT 个文件到 $TARGET/"
  echo "   现在运行 hugo server 即可通过 /legacy/xxx 访问"
fi
