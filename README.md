# OrdinaryRobot 的 Hugo 个人博客

这个仓库原本是一个用于检验 Web 网页设计课程学习成果的测试站点，现已加入 **Hugo + PaperMod** 博客结构。原有 HTML 页面和图片文件暂时保留。

- **站点地址**：https://ordinaryrobot.github.io/001HTML-Web/
- **仓库地址**：https://github.com/OrdinaryRobot/001HTML-Web

> **关于访问地址**：本仓库是 **项目站点**（Project Site），地址带仓库名路径 `/001HTML-Web/`。
> 如果想用根域名 `https://ordinaryrobot.github.io/`，需要把仓库改名为 `OrdinaryRobot.github.io`（GitHub 用户站点的命名规则）。两者不能同时成立，当前选择保留 `001HTML-Web` 这个仓库名。

##特别呜谢

感谢Github Copilot和WorkBuddy,我主要通过它们的协作建立了该仓库

## 本地运行

首次克隆后，初始化 PaperMod 子模块：

```bash
git clone https://github.com/OrdinaryRobot/001HTML-Web.git
cd 001HTML-Web
git submodule update --init --recursive
hugo server -D
```

浏览器打开 http://localhost:1313/ 即可预览。

> 需要 **Hugo Extended** 版（PaperMod 依赖 SCSS 编译）。查看版本：`hugo version`，输出中应含 `extended`。

## 写文章

```bash
hugo new posts/my-first-post.md
```

编辑 `content/posts/my-first-post.md`，确认 `draft: false` 后提交并推送到 `master`，GitHub Actions 会自动构建和部署。

## 目录结构

```
.
├── content/
│   ├── _index.md          首页
│   ├── about.md           关于我
│   ├── search.md          搜索页
│   ├── posts/             博客文章
│   └── legacy-guide/      旧站归档说明
├── static/                静态资源（legacy/ 由脚本自动生成，已忽略）
├── themes/PaperMod/       主题（git submodule）
├── docs/                  文档
├── .github/workflows/     GitHub Actions 自动部署
├── hugo.toml              站点配置
├── scripts/               本地辅助脚本
└── 预览博客.bat            双击启动本地预览
```

## 旧站文件怎么处理

把旧的 HTML 与图片直接放到**仓库根目录**即可。构建时 Hugo 会把它们放进网站的 `/legacy/` 下。

| 仓库根的文件 | 线上可访问的地址 |
|---|---|
| `index.html` | `/legacy/index.html` |
| `Section001.html` | `/legacy/Section001.html` |
| `photo.webp` | `/legacy/photo.webp` |

支持的类型：`.html` `.htm` `.webp` `.png` `.jpg` `.jpeg` `.gif` `.svg` `.css` `.js`

### 工作原理

部署与本地预览都遵循**同一条流程**：

```
仓库根旧站文件  →  复制到 static/legacy/  →  hugo build  →  public/legacy/  →  上线
```

在 `hugo build` **之前**把文件放进 `static/legacy/`，Hugo 会自动产出到 `public/legacy/`，不需要任何构建后处理。

- **CI**：`.github/workflows/hugo-pages.yml` 的 `Stage legacy static pages` 步骤自动完成复制
- **本地**：手动跑一次 `bash scripts/copy_legacy.sh`，之后 `hugo server` 就能预览

```bash
bash scripts/copy_legacy.sh
hugo server -D
# 访问 http://localhost:1313/001HTML-Web/legacy/index.html
```

> `static/legacy/` 已加入 `.gitignore`——源文件在仓库根，这里是自动生成的暂存目录，不需要提交。

> 归档说明页在 `/legacy-guide/`，与旧站文件的 `/legacy/` 是两个不同路径，不会互相覆盖。

## 搜索与评论

**搜索**已通过 PaperMod 的 JSON 输出接入（`hugo.toml` 里 `outputs.home` 含 `JSON`），使用 Fuse.js 做客户端模糊匹配，无需后端。

**评论**建议使用 Giscus：支持 GitHub Discussions、登录后评论和表情反应。启用步骤：

1. 在仓库 **Settings → General → Features** 中开启 **Discussions**
2. 安装 [Giscus App](https://github.com/apps/giscus) 并授权本仓库
3. 到 [giscus.app](https://giscus.app/) 获取 `repo_id` 和 `category_id`
4. 在 `hugo.toml` 的 `[params]` 中加入：

```toml
[params.giscus]
  repo = "OrdinaryRobot/001HTML-Web"
  repoId = "你的 repo_id"
  category = "Announcements"
  categoryId = "你的 category_id"
  mapping = "pathname"
  lang = "zh-CN"
```

> 注意：Giscus 使用 GitHub Markdown，因此无法仅靠主题配置强制限制为「仅文字和表情」。若必须限制内容格式，需要更严格的自定义评论后端。

## 部署

推送到 `master` 分支即自动部署到 GitHub Pages。

**首次部署前必须做一步**：在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，否则 workflow 跑完也不会发布。

部署后的地址：

- 首页：https://ordinaryrobot.github.io/001HTML-Web/
- 旧站入口：https://ordinaryrobot.github.io/001HTML-Web/legacy/index.html

### 关于 baseURL

站点地址只在两个地方配置，迁移时两处都要改：

| 位置 | 作用 |
|---|---|
| `hugo.toml` 的 `baseURL` | 本地构建的默认值 |
| workflow 的 `env.BASEURL` | CI 构建时通过 `--baseURL` 覆盖 |

CI 不硬编码在命令里，而是从 `env` 读取，这样迁移域名只需改一行。

> 想迁移到根域名 `https://ordinaryrobot.github.io/`？见 [docs/MIGRATION-TO-ROOT-DOMAIN.md](docs/MIGRATION-TO-ROOT-DOMAIN.md)。

## 提交规范

本项目遵循 Conventional Commits：

```
feat(search): 接入 Fuse.js 本地搜索
fix(nav): 移动端菜单遮挡内容
docs: 补充本地运行说明
chore(deps): 升级 Hugo 版本
```

可用 type：`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`
