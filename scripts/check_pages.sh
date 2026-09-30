#!/usr/bin/env bash
# ============================================================
# GitHub Pages 部署状态一键探测
# 用法: bash scripts/check_pages.sh
# 作用: 用无代理通道探测 Pages 配置 / Actions 运行 / 站点是否上线
# ============================================================

REPO="OrdinaryRobot/001HTML-Web"
SITE="https://ordinaryrobot.github.io/001HTML-Web/"

CURL="curl -s --noproxy * --connect-timeout 20"

echo "==================================================="
echo "  GitHub Pages 部署状态探测"
echo "  仓库: $REPO"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==================================================="
echo ""

# ---------- 1. Pages 站点配置 ----------
echo "[1/4] Pages 配置"
PAGES=$(curl -s --noproxy '*' --connect-timeout 20 "https://api.github.com/repos/$REPO/pages" 2>/dev/null)
if echo "$PAGES" | grep -q '"html_url"'; then
  echo "  ✅ Pages 已启用"
  echo "$PAGES" | python -c "import json,sys; d=json.load(sys.stdin); print('     URL   :', d.get('html_url')); print('     Status:', d.get('status')); print('     Source:', (d.get('build_type') or 'legacy'))" 2>/dev/null
else
  echo "  ❌ Pages 未启用（API 返回 Not Found）"
  echo "     -> 去 Settings > Pages，Source 选 'GitHub Actions'"
fi
echo ""

# ---------- 2. Actions 最近运行 ----------
echo "[2/4] Actions 最近运行"
curl -s --noproxy '*' --connect-timeout 20 "https://api.github.com/repos/$REPO/actions/runs?per_page=3" 2>/dev/null | python -c "
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print('  (解析失败)'); sys.exit()
runs=d.get('workflow_runs',[])
if not runs:
    print('  (无运行记录)')
for r in runs:
    icon = '✅' if r.get('conclusion')=='success' else ('❌' if r.get('conclusion')=='failure' else '⏳')
    print('  %s #%s %s | %s | %s' % (icon, r.get('run_number'), r.get('head_branch'), r.get('status'), r.get('conclusion') or 'running'))
    print('     %s' % r.get('html_url'))
    print('     %s' % r.get('created_at'))
" 2>/dev/null
echo ""

# ---------- 3. deploy job 失败定位 ----------
echo "[3/4] 最近一次运行的 Job 明细"
RUN_ID=$(curl -s --noproxy '*' --connect-timeout 20 "https://api.github.com/repos/$REPO/actions/runs?per_page=1" 2>/dev/null | python -c "import json,sys; print(json.load(sys.stdin)['workflow_runs'][0]['id'])" 2>/dev/null)
if [ -n "$RUN_ID" ]; then
  curl -s --noproxy '*' --connect-timeout 20 "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" 2>/dev/null | python -c "
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    sys.exit()
for j in d.get('jobs',[]):
    print('  JOB %s -> %s' % (j['name'], j['conclusion']))
    for s in j.get('steps',[]):
        mark = '  *' if s.get('conclusion')=='failure' else '   '
        print('%s %s %s' % (mark, s['name'], s.get('conclusion')))
" 2>/dev/null
else
  echo "  (未取到运行 ID)"
fi
echo ""

# ---------- 4. 站点可访问性 ----------
echo "[4/4] 站点访问探测"
for url in "$SITE" "${SITE}legacy/index.html" "${SITE}about/" "${SITE}posts/welcome/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --noproxy '*' --connect-timeout 20 "$url" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "  ✅ HTTP $code  $url"
  else
    echo "  ❌ HTTP $code  $url"
  fi
done
echo ""
echo "==================================================="
echo "  探测完成"
echo "==================================================="
