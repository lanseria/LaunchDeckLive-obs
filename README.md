# 🚀 LaunchDeck Live - OBS 火箭发射直播图层解决方案

[![Nuxt v3.11.2](https://img.shields.io/badge/Nuxt-3.11.2-00DC82.svg)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-Rapid-48B0F0.svg)](https://unocss.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<div align="center">
  <p>为航天主题的流媒体主播量身打造，提供专业、可定制的火箭发射倒计时与事件时间轴直播图层。</p>
  <img src="./public/preview.gif" width="800" alt="LaunchDeck Live 演示"/>
</div>

## ✨ 核心功能

LaunchDeck Live 是一个轻量级、高性能的 Web 应用，旨在作为 **OBS Studio** 或其他直播软件中的“浏览器源”，为您的直播添加精美的发射数据图层。

- **🌐 网页端控制面板**: 在一个直观的网页上配置所有直播参数，无需安装任何桌面软件。
- **🕒 精准时间控制**: 设置精确到秒的发射时间（支持时区），并可通过毫秒级偏移修正网络延迟。
- **📝 动态事件序列**: 自定义整个发射过程中的关键事件节点（如 `LIFTOFF`, `MAX-Q`, `MECO` 等）。
- **🎨 可定制时间轴**: 通过可视化编辑器调整动态时间轴的外观，使其更符合您的直播风格。
- **🟢 绿幕/蓝幕支持**: 轻松更改背景颜色，方便在直播软件中进行色度抠像。
- **⚡️ 实时数据推送**: 基于 **Server-Sent Events (SSE)**，后端配置一经保存，立即实时推送到您的 OBS 浏览器源，无需刷新。

## 🛠️ 技术架构

| 特性                   | 描述                                                                                                                   |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **🚀 全栈 Nuxt 3**     | 利用 Nuxt 3 的全栈能力，由内置的 **Nitro** 服务器提供高性能、低延迟的后端 API 和 SSE 服务。                            |
| **📡 实时通信**        | **控制端**通过 HTTP POST 请求更新配置；**显示端** (OBS) 通过 **Server-Sent Events (SSE)** 接收实时状态更新，稳定可靠。 |
| **🎨 高性能 SVG 渲染** | `TimelineSvg` 组件通过原生 JavaScript 和 SVG DOM 操作，实现了流畅、低资源占用的动态时间轴动画。                        |
| **💡 原子化样式**      | 采用 **UnoCSS** 实现即时、按需生成的原子化 CSS，确保最终的 OBS 图层加载速度极快。                                      |
| **🔒 端到端类型安全**  | **TypeScript** 贯穿整个项目，从控制页面板到 Nitro 后端 API，确保数据结构的一致性和代码的健壮性。                       |

## 🚀 快速开始

**环境要求:**

- Node.js >= 20.x
- pnpm >= 8.x

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
# 控制面板: http://localhost:10630/obs-control
pnpm dev
```

### 生产部署

```bash
# 构建用于生产环境的优化版本
pnpm build

# 启动生产服务器
pnpm start
```

## 📦 Docker 部署

我们提供了 `Dockerfile` 用于快速容器化部署。

```bash
# 1. 构建 Docker 镜像
docker build -t launchdeck-live .

# 2. 运行容器
docker run -d -p 10630:3000 --name launchdeck-live-app launchdeck-live
```

## 📖 使用指南

1.  **启动服务**: 运行 `pnpm dev` 或通过 Docker 部署。
2.  **配置任务**: 访问 `http://<your-host>/obs-control` 页面。
    - 填写任务名称、运载工具。
    - 设定精确的**发射时间**和**时区**。
    - 通过“编辑事件”和“编辑时间轴外观”按钮来定制您的数据和视觉效果。
3.  **获取链接**: 在“OBS 预览链接”区域，复制生成的 URL。您可以使用颜色选择器调整背景色以便抠图。
4.  **添加到 OBS**:
    - 在 OBS 中，添加一个新的“浏览器”源。
    - 将复制的 URL 粘贴到“URL”字段中。
    - 根据您的显示器分辨率，设置源的宽度和高度（推荐 `1920` x `1080`）。
5.  **开始直播**: 在控制面板点击“保存并向 OBS 推送”。所有更改将实时反映在您的 OBS 直播画面中。

## 🧩 核心文件解析

```
.
├── server/
│   ├── api/obs/
│   │   ├── config.post.ts  # [API] 接收并处理来自控制面板的配置更新
│   │   └── events.get.ts   # [API] 建立 SSE 连接，向 OBS 显示端推送数据
│   └── utils/
│       └── obsState.ts     # [后端] 内存状态管理，存储当前配置并广播更新
├── app/
│   ├── pages/
│   │   ├── obs-control.vue # [页面] OBS 直播控制面板
│   │   └── obs-display.vue # [页面] OBS 浏览器源显示端
│   ├── components/
│   │   ├── Dashboards/OBS.vue # [UI] OBS 显示端的核心仪表盘组件
│   │   └── MissionEditorModal.vue # [UI] 事件序列编辑器模态框
└── types/
    └── launchdeck.d.ts     # [核心] 全局 TypeScript 类型定义，前后端共享
```

## 🤝 贡献

欢迎任何形式的贡献！如果您有好的想法或发现了问题，请随时提交 Pull Request 或创建 Issue。

1.  Fork 本仓库。
2.  创建您的特性分支 (`git checkout -b feature/new-cool-feature`)。
3.  提交您的更改 (`git commit -m 'feat: Add some cool feature'`)。
4.  将您的分支推送到 GitHub (`git push origin feature/new-cool-feature`)。
5.  创建一个 Pull Request。

## 📜 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 授权。
