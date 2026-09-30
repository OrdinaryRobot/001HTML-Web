# 迁移到根域名指南

当前站点是**项目站点**，地址为 `https://ordinaryrobot.github.io/001HTML-Web/`（带仓库名路径）。
本文说明如何迁移到**用户站点**（根域名 `https://ordinaryrobot.github.io/`）。

---

## 一、两种站点的区别

| | 项目站点（当前） | 用户站点（迁移后） |
|---|---|---|
| 仓库名要求 | 任意 | **必须是 `OrdinaryRobot.github.io`** |
| 访问地址 | `https://ordinaryrobot.github.io/001HTML-Web/` | `https://ordinaryrobot.github.io/` |
| 一个账号能有几个 | 无限个 | **只能一个** |
| 适合场景 | 多个项目并存 | 个人主页/主博客 |

> ⚠️ 关键限制：一个 GitHub 账号**只能有一个用户站点仓库**。一旦把 `001HTML-Web` 改名，这个名字就没了，且不能再建第二个用户站点。

---

## 二、迁移步骤（最小改动）

### 步骤 1：重命名仓库

GitHub 网页操作：

```
仓库页 → Settings → General → Repository name
改为：OrdinaryRobot.github.io
点击 Rename
```

> GitHub 会为旧仓库名保留重定向，`git remote` 指向旧地址仍可推送，但**建议主动改掉**以免混淆。

### 步骤 2：更新本地 remote

```bash
cd /d/WorkBuddy/001HTML-Web
git remote set-url origin https://github.com/OrdinaryRobot/OrdinaryRobot.github.io.git
git remote -v   # 确认
```

### 步骤 3：更新 `hugo.toml`

```diff
- baseURL = "https://ordinaryrobot.github.io/001HTML-Web/"
+ baseURL = "https://ordinaryrobot.github.io/"
```

### 步骤 4：更新 CI 的 baseURL

`.github/workflows/hugo-pages.yml` 中，只需改一处：

```diff
  env:
-   BASEURL: https://ordinaryrobot.github.io/001HTML-Web/
+   BASEURL: https://ordinaryrobot.github.io/
```

> 这就是当初把 baseURL 抽到 `env` 的好处——迁移只改一行。

### 步骤 5：检查内部链接

搜索仓库里所有硬编码的绝对路径：

```bash
grep -rn "/001HTML-Web/" content/ layouts/ static/ README.md 2>/dev/null
```

**建议改用 Hugo 的相对链接或内置函数**，这样迁移时无需手工修改：

| 场景 | 推荐写法 |
|---|---|
| Markdown 正文内链 | `[文字](/posts/xxx/)`（Hugo 会自动加 baseURL 前缀） |
| 模板内链接 | `{{ "/posts/" \| relURL }}` 或 `{{ relURL "posts/" }}` |
| 取站点根地址 | `{{ site.BaseURL }}` |

> Hugo 对 Markdown 中以 `/` 开头的链接会自动补上 baseURL，所以**正文里通常不用改**。真正需要检查的是模板和硬编码的完整 URL。

### 步骤 6：验证

```bash
# 本地构建，确认无 ERROR
BASEURL="https://ordinaryrobot.github.io/" hugo --minify --baseURL "${BASEURL}"

# 检查产物中的链接是否正确指向根域名
grep -o 'https://ordinaryrobot.github.io[^"]*' public/index.html | head -5
```

确认无误后推送：

```bash
git add .
git commit -m "chore(deploy): 迁移站点到根域名 OrdinaryRobot.github.io"
git push origin master
```

### 步骤 7：GitHub Pages 设置

重命名后重新检查：

```
Settings → Pages
- Source: GitHub Actions
- 确认 Custom domain 为空（除非用自有域名）
```

---

## 三、成本评估

| 影响面 | 程度 | 说明 |
|---|---|---|
| 操作本身 | **低** | 改名 + 改 2 处配置，10 分钟内完成 |
| 内部链接 | **低** | Hugo 自动处理 Markdown 内链，只需检查模板 |
| 外部链接失效 | **中** | 已分享的 `/001HTML-Web/xxx` 链接会 404 |
| SEO 重新索引 | **中** | 搜索引擎需时间重新收录，短期内排名波动 |
| 浏览器缓存 | **低** | 访问者可能短期遇到 404，刷新即可 |
| CI/自动化 | **低** | 只改一行 env |

**结论**：技术操作简单（低），**主要成本在外部链接和 SEO**，取决于外部引用数量。个人博客通常引用很少，影响可忽略。

---

## 四、低风险迁移策略

如果站点已被引用、不想让老链接失效：

1. **保留旧仓库作为跳转页**
   新建 `OrdinaryRobot.github.io`，但先不改 `001HTML-Web`。在 `001HTML-Web` 里放一个 index 页面，引导访问者跳转到新站。

2. **先把内部链接全部改成相对路径**
   迁移前先跑一遍上面步骤 5 的检查，把所有硬编码绝对链接改成 Hugo 相对链接。这样迁移时只需改 baseURL。

3. **选低峰期执行**
   迁移后立即验证首页、文章页、旧站页能否正常访问。

4. **保留旧仓库一段时间**
   不要立刻删除 `001HTML-Web`，让搜索引擎和外部链接有时间收敛。

---

## 五、如果使用自定义域名

自定义域名和根域名是**两件不同的事**：

1. 在仓库根添加 `static/CNAME`，内容为你的域名（如 `blog.example.com`）
2. 在域名 DNS 服务商配置：
   - 顶级域名（`example.com`）：添加 4 条 A 记录指向 GitHub Pages IP
   - 子域名（`blog.example.com`）：添加 CNAME 记录指向 `ordinaryrobot.github.io`
3. 在仓库 `Settings → Pages → Custom domain` 填入域名，勾选 **Enforce HTTPS**

用了自定义域名后，`baseURL` 应改为 `https://你的域名/`。

---

## 六、决策记录

**当前选择项目站点，不改名。** 理由：

- 用户站点仓库一个账号只能有一个，改名会锁死这个名额
- `001HTML-Web` 仓库名承载了课程作业的历史，有保留价值
- 项目站点功能完全够用，仅 URL 多一段路径
- 日后若确实需要根域名，可**另建** `OrdinaryRobot.github.io` 仓库，与当前仓库**并存**

需要迁移时，照本文执行即可。
