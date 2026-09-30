#!/usr/bin/env bash
#
# 把仓库根的静态 html / 图片复制到 static/legacy，方便本地 hugo server 预览
#
# 说明：GitHub Actions 部署时也会做同样的事（复制到 public/legacy/）。
#       本地跑 hugo server 不会自动复制，所以预览旧站前先执行本脚本。
#
# 用法：
#   bash scripts/copy_legacy.sh
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TARGET="static/legacy"
mkdir -p "$TARGET"

# 匹配的扩展名
PATTERNS=(
  -iname "*.html" -o -iname "*.htm"
  -o -iname "*.webp" -o -iname "*.png"
  -o -iname "*.jpg" -o -iname "*.jpeg"
  -o -iname "*.gif" -o -iname "*.svg"
  -o -iname "*.css" -o -iname "*.js"
)

COUNT=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  cp -f "$f" "$TARGET/"
  echo "  复制: $f"
  COUNT=$((COUNT + 1))
done < <(find . -maxdepth 1 -type f \( "${PATTERNS[@]}" \) -exec basename {} \;)

if [ "$COUNT" -eq 0 ]; then
  echo "仓库根目录没有找到 html / 图片 / css / js 文件，无需复制。"
  echo "（把旧站文件放到仓库根目录后再运行本脚本）"
else
  echo ""
  echo "✅ 已复制 $COUNT 个文件到 $TARGET/"
  echo "   现在运行 hugo server，即可通过 /legacy/xxx 访问"
fi
