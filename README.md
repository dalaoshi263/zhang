# 张依婷 · 剪辑师作品集

基于 React + Vite 的个人作品集基础版，面向 PC 展示，采用暗色视觉、全屏视频首页和约 1700px 的内容版心。

## 本地运行

Windows 可直接双击本目录的 **`启动作品集.cmd`**。启动器会检查固定地址 `http://127.0.0.1:5173/#home`：网站已运行时直接打开，未运行时在后台启动预览、确认就绪后再打开浏览器。它会优先查找系统 Node，不满足版本要求时尝试 Codex 自带的 Node；不会结束占用端口的其他程序。出现启动错误时查看 `qa/start-preview.stderr.log` 和 `qa/start-preview.stdout.log`。

这是仅在本机运行的预览服务，不是永久托管网址。电脑重启或预览进程停止后，需要再次双击启动器；刷新浏览器本身不能重新启动服务。排查时可运行 `node scripts/start-preview.cjs --no-open`，只检查或启动服务，不自动打开浏览器。

在本目录执行：

```sh
pnpm install
pnpm dev
```

打开终端显示的本地地址。生产构建及本地预览：

```sh
pnpm build
pnpm preview
```

## 页面内容

- 首页：视频背景、导航与联系入口。
- 个人经历：人物展示、介绍、教育经历、项目数据和工作经历。
- 精选项目：按类型筛选作品，点击卡片打开项目说明与视频播放器。
- 个人优势：剪辑节奏、后期细节、脚本拍摄与数据复盘。
- 联系收尾：邮箱、电话和简历入口。

首页可暂停或播放静音背景视频；项目播放器支持声音、进度与全屏控制，支持 Esc 或点击关闭按钮退出；邮箱可复制，邮箱与电话均可点击联系。作品支持选择电脑上的视频进行临时预览，文件不上传，刷新页面后预览失效。

## 内容与素材说明

姓名、教育、联系方式、两段工作经历及项目数据依据提供的简历整理，汽车贴膜经历为 **2026.07 — 2026.10**。第三个「从素材，到成片」为明确标注的**示意练习**，没有商业成果数据。

当前头像以用户提供的「新素材-第1集-分镜1-1006.png」为参考，通过内置 ImageGen 编辑：中长黑发搭配自然轻薄刘海，长度约至肩胛骨、正面发尾落在上胸，穿奶油色开衫；头肩正面居中、头部端正、不带手势，背景透明；眼镜为银色细金属框，镜圈近圆形并略带多边形轮廓。当前文件为 `public/images/portrait-front-bangs.png`，提示词见 `PORTRAIT-BANGS-PROMPT.md`。简历原照、此前的皮克斯版本及各中间版本均保留。

头像使用静态正面照，悬停时相框有暖色扫光，支持鼠标或触摸拖拽并轻柔归位；聚焦后可用方向键移动、Enter / 空格 / Esc 复位。背景视频与项目封面使用公开素材，仅用于展示网站效果，不能视作本人完成的作品。两项真实经历的实际成片尚待补充；在接入真实视频前，播放器显示有标识的示例视频。素材来源见 ASSETS.md。

## 部署到 GitHub Pages

仓库命名为 `zhang`。将仓库的默认分支设为 `main` 并推送后，GitHub Actions 会构建并发布网站到 `https://<GitHub用户名>.github.io/zhang/`。路径前缀由 `GITHUB_PAGES=true` 自动启用；本地预览仍使用根路径。

作品视频会以 H.264 MP4 版本发布，原始大文件留在本地的 `source-media/portfolio-originals/`，不随网页仓库提交。

## 后续替换

- `src/content.js`：个人介绍、联系方式、经历、项目详情、数据与能力文案。
- `public/images/portrait-front-bangs.png`：页面当前使用的透明头像，轻薄刘海、中长黑发、银色细框近圆形眼镜。
- `PORTRAIT-BANGS-PROMPT.md`：当前头像的 ImageGen 发型编辑提示词记录。
- `public/images/portrait-front-round.png`：银色细框近圆形眼镜的中间版本；编辑记录保留在 `PORTRAIT-ROUND-PROMPT.md`。
- `public/images/portrait.jpg`：从简历提取的原始头像，保留备份。
- `public/images/portrait-pixar.png`：此前的皮克斯风格头像；原始生成记录保留在 `PORTRAIT-PROMPT.md`。
- `public/images/portrait-front-silver.png`：矩形银色眼镜的中间版本；编辑记录保留在 `PORTRAIT-FRONT-PROMPT.md`。
- `public/images/hero.jpg`：首页背景视频的静态封面。
- `public/images/automotive.jpg`：汽车贴膜项目封面。
- `public/images/fashion.jpg`：个人 IP / 服装家纺项目封面。
- `public/images/lifestyle.jpg`：剪辑流程示意封面。
- `public/video/hero.mp4`：首页背景与项目示例视频。
- `public/resume.pdf`：已将贴膜项目结束日期更新为 2026-10 的简历。
- `src/App.jsx` 和样式文件：页面布局、视觉与交互。

媒体文件保持同一路径时无需修改代码。更改名称或路径后，请同步更新组件或内容数据中的引用。

接入真实作品时，将视频放入 `public/video/`，并在 `src/content.js` 中对应的项目对象添加 `video` 字段，例如 `video: '/video/automotive.mp4'`；也可填入支持直接播放的视频链接。临时选择本地文件适合预览，长期展示请使用 `video` 字段。
