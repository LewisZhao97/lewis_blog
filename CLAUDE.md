# CLAUDE.md

本文件为 Claude Code 在本仓库中工作时提供指引。

## 项目概览

Lewis 的个人技术美术博客「Psygoose Blog」，纯静态站点（`output: 'static'`，无 adapter），部署在 Vercel（`site: https://psygooseblog.vercel.app/`）。
基于 Astro 5 + Tailwind 3 + MDX，主题源自 Astro Pure / astro-theme-axi，内部集成已改名为 `astro-lewis`。站点为中英双语。

包管理器为 **pnpm**（有 `pnpm-lock.yaml`）。项目没有测试。

## 常用命令

```bash
pnpm dev            # 本地开发（server.host: true，局域网可访问）
pnpm build          # astro check + astro build，类型错误会导致构建失败
pnpm preview        # 预览 dist/
pnpm check          # 仅类型检查（astro check）
pnpm lint           # eslint --fix src/
pnpm format         # prettier 全量格式化
pnpm sync           # astro sync，修改 content.config.ts 后重新生成类型
```

`pnpm clean` 使用 `rm -rf`，在 Windows 上需要在 Git Bash 中运行。

## 架构

### 配置链路
- `astro.config.mjs`：i18n、markdown 管线（remark-math/gfm、rehype-katex、标题锚点、Shiki 双主题 `github-light`/`github-dark` + 自定义 transformers），并挂载 `AstroLewisIntegration(config)`。文件里有大量孤立的 `;` 空行，是历史格式化残留，无害。
- `src/site.config.ts`：站点的主要配置入口（标题、作者、header 菜单、footer、分享、个人信息、Waline 评论、pagefind、medium-zoom 等）。改站点行为优先改这里。
- `src/lewis-integration.ts`：用 `src/types/user-config.ts` 中的 zod schema 校验配置；自动补充 sitemap / mdx / tailwind 集成；注入 `remarkReadingTime`、`remarkAddZoomable`、`rehype-external-links`；`astro:build:done` 时运行 `npx pagefind` 生成搜索索引（因此**搜索只在 build 之后可用，dev 下不可用**）。
- `src/plugins/virtual-user-config.ts`：把校验后的配置暴露为虚拟模块 `virtual:config`。组件里通常直接 `import config from '@/site-config'`。

### 内容集合（`src/content.config.ts`）
| 集合 | 来源 | 说明 |
|---|---|---|
| `blog` | `src/content/blogs/**/index.{md,mdx}` | 中文文章 |
| `blogEn` | `src/content/blogs/**/index-en.{md,mdx}` | 英文文章 |
| `postCollections` | `src/content/collection/*.{md,mdx}` | 专题合集，`bloglist` 引用文章目录名；`title_en`/`description_en` 用于英文路由 |

- 每篇文章一个目录：`src/content/blogs/<slug>/index.mdx`（中文）+ `index-en.mdx`（英文，可选）。目录名即 URL slug。
- frontmatter 必填：`title`（≤60 字符）、`description`（≤300 字符）、`publishDate`。tags 会被去重并转小写。`draft: true` 仅在生产构建中被过滤。
- `getBlogCollectionEn()`（`src/utils/server.ts`）：若某篇没有 `index-en`，英文站点回退显示中文版本。
- `src/scripts/new.mjs` 生成的是扁平的 `blogs/<slug>.md`，与上述 glob 不匹配，**不要用它建文章**，手动建目录。
- 文章内容通常在 Obsidian 中编辑（`.obsidian/` 带 edit-mdx 插件）。

### 国际化
- `zh` 为默认语言且无前缀，`en` 位于 `/en/*`（`prefixDefaultLocale: false`，`trailingSlash: 'never'`）。
- **页面是手工复制的双份**：`src/pages/xxx` 与 `src/pages/en/xxx` 结构一一对应，界面文案直接硬编码在各自的 `.astro` 里（没有翻译字典）。修改任何页面的逻辑或布局时，必须同步修改另一语言版本。
- 语言判断用 `Astro.currentLocale`；生成链接用 `astro:i18n` 的 `getRelativeLocaleUrl` / Header 中的 `getLocalizedUrl`；切换按钮见 `src/components/user/LanguageSwitch.astro`。

### Library（书/影/番/游戏）数据
- 数据在 `public/data/*.json`，页面通过别名 `@/public/*` 在**构建时** import（不是运行时 fetch），改数据后需要重新构建。
- `animes` / `games` / `movies` 各有一个 `*-overrides.json`，页面按 `id` 把 override 字段浅合并到主数据上；手写的短评、推荐状态等应写在 overrides 里，主数据会被抓取脚本覆盖。
- 数据字段名是中文 key（如 `番剧名`、`推荐状态`、`观看进度`）。
- 根目录的 `fetch-bangumi.js` / `fetch-steam.js` / `fetch-tmdb.js` / `sync-overrides.js` 是本地数据抓取与对账脚本（`node fetch-xxx.js` 运行），**已被 `.gitignore` 忽略且内含 API Key，切勿提交或把 Key 写进其他被跟踪的文件**。`sync-overrides.js` 用 overrides 中的模板键为新条目补全占位记录。

### 目录速览
- `src/layouts/`：`BaseLayout`（html 外壳、主题、GA）→ `CommonPage` / `ContentLayout` / `BlogPost` / `IndividualPage`。
- `src/components/`：
  - `basic/`：Header、Footer、ThemeProvider
  - `pages/`：文章列表、TOC、分页、搜索、Hero 等页面级组件
  - `user/`：可在 MDX 中使用的组件（Aside、Tabs、TabItem、Steps、Timeline、Card、Collapse、Spoiler…），MDX 中写法为 `import { Aside, Tabs } from 'src/components/user/'`
  - `advanced/`：GithubCard、LinkPreview、Quote、QRCode、Comment（Waline）等
  - `about/`、`home/`、`projects/`、`links/`：各页面专用组件
- `src/plugins/`：自定义 remark/rehype 插件、Shiki transformers、`output-copier`（把 sitemap/pagefind 产物拷贝到输出目录）。
- `src/utils/`：日期、阅读时长、主题、toast、`webgl/` 背景效果等；`src/server.ts` 汇总需要 `astro:content` 的服务端工具（`@/server`）。
- `src/schemas/`、`src/types/`：配置 schema 与类型定义。
- 样式：`src/assets/styles/app.css`（CSS 变量 + 字体）、`tailwind.config.mjs`（`darkMode: 'class'`，自定义 `prose-lewis` 排版）。

## 代码风格

- Prettier：无分号、单引号、`printWidth: 100`、不加尾逗号、2 空格缩进；带 astro / tailwind 类名排序 / import 排序插件（顺序：astro → @astrojs → 第三方 → `@/types` → `@/layouts` → … → 相对路径）。
- 使用 `tsconfig.json` 中的路径别名：`@/components/*`、`@/layouts/*`、`@/utils`、`@/libs/*`、`@/site-config`、`@/server`、`@/public/*` 等。
- 类名合并用 `cn()`（`@/libs/utils.ts` 中，基于 clsx + tailwind-merge）。
- 颜色使用 `app.css` 中定义的语义化 CSS 变量（`text-muted-foreground`、`bg-card`、`border` 等），保证亮/暗主题一致。
- 现有代码注释中英混杂，延续所在文件的风格即可。

## 已知遗留 / 注意事项

- `site.config.ts` 中 `waline.server` 仍是占位地址 `https://waline.example.com/`，`personal.domains.main` 仍是上游主题的 `theme.axi404.top`（友链申请信息依赖它）。
- `package.json` 中 `rehype-mermaid`、`@astrojs/cloudflare` 等依赖已安装但当前未在配置中启用。
- `AGENTS.md` 被 gitignore，属于本地文件。
