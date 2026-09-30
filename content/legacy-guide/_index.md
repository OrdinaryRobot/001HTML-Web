---
title: "旧站练习页"
description: "课程练习阶段的静态页面存档说明"
url: "/legacy-guide/"
ShowToc: false
ShowReadingTime: false
ShowBreadCrumbs: false
---

这里存放博客改版前的课程练习页面。**旧站文件本身位于 `/legacy/` 路径下。**

## 如何使用

把旧的 HTML 文件（以及配套图片）直接放到**仓库根目录**即可。每次推送后，部署流程会自动把它们复制到网站的 `/legacy/` 下。

例如：

| 仓库根的文件 | 部署后可访问的地址 |
|---|---|
| `index.html` | `/legacy/index.html` |
| `Section001.html` | `/legacy/Section001.html` |
| `photo.webp` | `/legacy/photo.webp` |

## 本地预览旧站

本地 `hugo server` 不会自动复制根目录文件，先运行一次：

```bash
bash scripts/copy_legacy.sh
```

它会把根目录的 HTML / 图片复制到 `static/legacy/`，之后就能通过 `/legacy/index.html` 访问了。

## 当前已归档的页面

<!-- 把已放入根目录的文件列在这里，方便自己查找 -->

_（还没有归档任何页面。把文件推到仓库根目录后，它们会自动出现在 `/legacy/` 下。）_
