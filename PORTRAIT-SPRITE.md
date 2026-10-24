# 视频人物转头 / Sprite 校准记录

> 历史实验记录：当前个人简介页面已切换为静态正面头像，不加载本文件中的转头图集或控制器。现有交互为拖动头像后轻柔归位，以及相框的悬停扫光。旧的独立跟随演示页已退役；本文件仅记录素材校准过程。

源文件：`D:/Backup/Downloads/自由-第1集-分镜1-1.mp4`。原片保持不变，960 × 960、24 fps，实际解码得到 193 帧，帧号从 0 开始。

## 先看 contact sheet，再校准

先运行 `scripts/build_portrait_sprite.py --inspect` 抽取全部原始帧，按每 4 帧生成带有精确源帧号和时间的 contact sheet。已实际查看两张 contact sheet，并查看 136、156 帧的大图；156 帧处于眨眼阶段，因此没有用作朝向锚点。

- [contact sheet 01](./public/portrait-turn/contact-sheet-01.jpg)：源帧 0–96。
- [contact sheet 02](./public/portrait-turn/contact-sheet-02.jpg)：源帧 100–192。

观察到的动作顺序为：正面 → 右 → 右上 → 上 → 左上 → 左 → 左下 → 下 → 回正。各段停留时间和变化速度不同，不能把角度等分后直接映射到连续视频帧。

屏幕角度约定：右为 0°，下为 90°，左为 180°，上为 270°。`ANGLE_KEYS` 包含 20 个人工核对的姿态锚点，另有正面帧。运行时取最近的已校准锚点，并使用 3° 滞回避免边界闪动；不会对无关视频帧号进行插值。

| 鼠标方向 | 屏幕角度 | 图集格号 | 原视频帧号 |
| --- | ---: | ---: | ---: |
| 上 | 270° | 14 | 72 |
| 右 | 0° | 1 | 28 |
| 下 | 90° | 2 | 136 |
| 左 | 180° | 8 | 100 |
| 左上 | 225° | 11 | 88 |
| 左下 | 135° | 5 | 116 |
| 中心 | 面部中心死区 | 0 | 0 |
| 右上 | 315° | 17 | 52 |

完整映射记录在 [calibration.json](./public/portrait-turn/calibration.json)，并已内嵌到静态 HTML 的 `CONFIG` / `ANGLE_KEYS` 中。源视频没有独立的右下姿态，该区域选择最近的已有朝向；没有镜像或补造新的姿态。

## 透明背景和主体保护

原视频是浅灰白背景，并非绿幕；与奶油色针织衣服的高光相近。处理采用逐帧边缘背景颜色模型、与画面边缘连通的背景区域和填充的主体轮廓，保护服装、脸和眼镜内部。只在头发外缘估计半透明覆盖并去除背景色，不按全图亮度删除白色、灰色像素。

所有格子使用相同的 960 × 960 原图坐标，不逐帧裁切或移动人物，避免跳动。输出为 21 格、每格 448 × 448 的 7 × 3 静态 WebP 图集；`frame_front.webp` 是同一图集的正面格。

重建命令（使用项目 Python 环境及 Pillow / NumPy）：

```sh
python scripts/build_portrait_sprite.py --inspect
python scripts/build_portrait_sprite.py --build
```

校准仅适用于本次源视频；更换视频后必须重新查看 contact sheet、调整源帧号。

## 旧版静态演示与作品集接入（已退役）

原来的 `public/portrait-turn/index.html` 使用内嵌脚本与校准表，只依赖同目录下 `sprite.webp`、`frame_front.webp`；该演示页已从当前作品集退役。

此前 React 作品集曾通过 `PortraitSprite` 接入同一图集和共享控制器；当前版本已移除此接入，页面只显示静态正面 WebP。

## 验证

透明边缘、浅色衣服保护、静态浏览器七方向及作品集集成的最终验证记录见 `tmp/portrait-turn/alpha-qa.json` 与 `qa/portrait-turn-browser.json`；方向图和页面截图保留在对应目录。

本地 HTTP 预览中使用实际鼠标坐标逐一核对上述七个方向，全部匹配预期格号；React 头像也已验证转头、拖拽后归位及方向键移动 / Escape 复位，控制台无警告或错误。生产构建通过。内置浏览器只允许 HTTP / HTTPS，因此未实测直接 `file://` 打开；独立 HTML 已检查为无外部依赖、无请求接口的三文件结构。

历史归档 [三文件静态包](./exports/portrait-turn-static.zip) 内含旧版 `index.html`、`sprite.webp`、`frame_front.webp`，仅用于保留此前的校准成果。
