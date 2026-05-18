# Obsidian Tags Plugin

这是一个功能强大的 Obsidian 插件，用于自动管理笔记的 YAML frontmatter 和标签系统。它能够根据内容智能匹配标签，并支持批量处理多个笔记文件。

## 功能特性

- **YAML Frontmatter 管理**: 自动生成和管理笔记的 YAML frontmatter
- **智能标签匹配**: 基于关键词规则自动为笔记添加相关标签
- **批量处理**: 支持对整个目录下的所有 Markdown 文件进行批量处理
- **可配置模板**: 自定义 YAML frontmatter 模板
- **灵活的标签规则**: 支持正则表达式和大小写敏感的标签匹配规则
- **动态变量替换**: 支持 {{title}}, {{created}}, {{updated}} 等动态变量

## 安装

### 手动安装

1. 下载最新版本的 `main.js`, `manifest.json` 和 `styles.css`(如果有)
2. 将文件复制到你的 Vault 中的 `<Vault>/.obsidian/plugins/obsidian-tags-plugin/` 目录
3. 在 Obsidian 中重新加载应用
4. 在 **设置 → 社区插件** 中启用此插件

### 从源码构建

```bash
# 克隆仓库
git clone <repository-url>
cd obsidian-tags

# 安装依赖
npm install

# 开发模式(自动编译)
npm run dev

# 生产构建
npm run build
```

## 使用方法

### 基本使用

1. 打开任意 Markdown 笔记
2. 点击左侧边栏的 "添加YAML和标签" 按钮，或使用命令面板:
    - `应用YAML frontmatter`: 仅添加/更新 YAML frontmatter
    - `应用匹配的标签`: 仅添加匹配的标签
    - `应用YAML和标签`: 同时添加 YAML frontmatter 和匹配的标签(推荐)

### 批量处理

1. 在插件设置中指定目标目录
2. 使用 "应用YAML和标签" 命令或侧边栏按钮
3. 插件将自动处理指定目录下的所有 Markdown 文件

## 配置

### YAML 模板设置

在插件设置页面，你可以:

- 创建和编辑 YAML frontmatter 模板
- 启用/禁用动态生成模式
- 定义模板中包含的字段

默认模板包含以下字段:

```yaml
title: { { title } }
created: { { created } }
updated: { { updated } }
categories: []
author:
description:
source:
link:
aliases: []
tags: []
```

支持的动态变量:

- `{{title}}`: 从文件名提取的标题
- `{{created}}`: 当前日期 (YYYY-MM-DD)
- `{{updated}}`: 当前日期 (YYYY-MM-DD)
- `{{filepath}}`: 完整文件路径

### 标签匹配规则

在插件设置页面，你可以:

- 添加/删除标签匹配规则
- 定义关键词(支持正则表达式)和对应的标签
- 启用/禁用特定规则
- 设置是否区分大小写

示例规则:

- 关键词: `教程|tutorial` → 标签: `tutorial`
- 关键词: `笔记|note` → 标签: `note`

### 目标目录设置

- 留空: 只处理当前打开的文件
- 指定路径: 批量处理指定目录下的所有 Markdown 文件(如 "00-Inbox" 或 "Notes/Tutorials")

## 开发指南

### 项目结构

```
src/
  main.ts           # 插件入口点和生命周期管理
  settings.ts       # 设置界面和默认配置
  tag-matcher.ts    # 标签匹配引擎
  yaml-manager.ts   # YAML frontmatter 管理器
```

### 技术栈

- TypeScript
- Obsidian Plugin API
- esbuild (打包工具)

### 版本发布

本项目使用 GitHub Actions 自动打版和发布。发布新版本步骤：

1. **更新版本号**:

    ```bash
    # 小版本更新 (1.0.0 -> 1.0.1)
    npm version patch

    # 中版本更新 (1.0.0 -> 1.1.0)
    npm version minor

    # 大版本更新 (1.0.0 -> 2.0.0)
    npm version major
    ```

2. **推送标签**:

    ```bash
    git push origin main --tags
    ```

3. **自动发布**:
    - GitHub Actions 会自动检测到新的 tag
    - 自动构建插件 (`main.js`)
    - 自动创建 GitHub Release 并上传以下文件:
        - `main.js`
        - `manifest.json`
        - `styles.css` (如果存在)

4. **查看发布**:
    - 访问仓库的 [Releases](../../releases) 页面查看最新发布

> **注意**: 确保在推送前已更新 `manifest.json` 中的 `minAppVersion` 字段（如需要）。

### 贡献代码

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 支持

如果你遇到问题或有建议，请在 GitHub 仓库中提交 Issue。

---

**注意**: 此插件遵循 Obsidian 开发者政策和插件指南，不会收集任何用户数据或访问网络。
