# 首页电影感混剪说明

`public/video/cinematic-reel.mp4` 是为网站制作的六镜头演示混剪，素材来自 Pexels。它展示网站的影像氛围和剪辑节奏，不代表张依婷拍摄或完成的真实客户作品。

## 成片

- 文件：`public/video/cinematic-reel.mp4`
- 时长：22.75 秒，546 帧
- 尺寸：1920 × 1080，16:9，方形像素
- 视频：H.264 High，yuv420p，24 fps，BT.709
- 大小：10,843,982 字节，约 10.84 MB
- 平均视频码率：约 3.81 Mb/s
- 无音轨，无额外字幕、片名、水印或标志
- `moov` 位于 `mdat` 之前，已启用 faststart
- 统一轻度降低饱和度、增加对比度，阴影偏青，亮部偏暖
- 起始 0.25 秒淡入，末尾短淡出；首帧和末帧黑场平均 RGB 完全一致，循环衔接平顺
- 封面：`public/images/cinematic-poster.jpg`，1920 × 1080，取自成片 1.5 秒处

旧版 `public/video/hero.mp4` 保留，成片只使用其中一个 3.75 秒片段。

## 剪辑表

时间以秒计。叠化区间内，两条素材的时间范围重叠。

| 镜头 | 成片时间 | 源素材入点 → 出点 | 内容 | 转场 |
| --- | --- | --- | --- | --- |
| 01 | 0.000 → 4.000 | 9.000 → 13.000 | 青蓝投影光下的人物眼神特写 | 黑场短淡入，结束硬切 |
| 02 | 4.000 → 7.500 | 2.500 → 6.000 | 老式摄影机镜头细节与焦点变化 | 7.250 → 7.500，0.25 秒叠化 |
| 03 | 7.250 → 11.000 | 9.000 → 12.750 | 青色路面与暖色车灯的城市夜间交通 | 结束硬切 |
| 04 | 11.000 → 15.000 | 2.000 → 6.000 | 薄雾、山脊与低角度阳光 | 14.750 → 15.000，0.25 秒叠化 |
| 05 | 14.750 → 18.750 | 2.000 → 6.000 | 日落海岸与连续推进的浪线 | 结束硬切 |
| 06 | 18.750 → 22.750 | 0.800 → 4.800 | 金色落日与远山层次 | 末尾短淡出至黑场 |

采用三次硬切和两次短叠化，单镜头素材长度 3.5–4 秒。源素材帧率统一为 24 fps；为精确对齐最终循环长度，最后两帧延长前一帧的黑场。

## 素材来源与署名

| ID | 作者 | 素材页面 | 下载文件 |
| --- | --- | --- | --- |
| 7846591 | cottonbro studio | [Closeup Shot of Female Face Under Neon Light](https://www.pexels.com/video/closeup-shot-of-female-face-under-neon-light-7846591/) | [MP4](https://videos.pexels.com/video-files/7846591/7846591-hd_2048_1080_25fps.mp4) |
| 4890410 | José Lizardo | [Close-up Footage Of An Analog Camera Lens](https://www.pexels.com/video/close-up-footage-of-an-analog-camera-lens-4890410/) | [MP4](https://videos.pexels.com/video-files/4890410/4890410-hd_1920_1080_24fps.mp4) |
| 5057439 | Max Avans | [Video of City Traffic at Night](https://www.pexels.com/video/video-of-city-traffic-at-night-5057439/) | [MP4](https://videos.pexels.com/video-files/5057439/5057439-hd_1920_1080_25fps.mp4) |
| 8150386 | ArtHouse Studio | [Drone Footage of Mountains](https://www.pexels.com/video/drone-footage-of-mountains-8150386/) | [MP4](https://videos.pexels.com/video-files/8150386/8150386-hd_1920_1080_24fps.mp4) |
| 5967989 | Lachlan Ross | [Aerial Shot of an Ocean During Sunset](https://www.pexels.com/video/aerial-shot-of-an-ocean-during-sunset-5967989/) | [MP4](https://videos.pexels.com/video-files/5967989/5967989-hd_1920_1080_24fps.mp4) |
| 19453966 | Giorgi Chkhaidze | [Drone footage of a mountain range at sunset](https://www.pexels.com/video/drone-footage-of-a-mountain-range-at-sunset-moving-forward-slowly-19453966/) | [MP4](https://videos.pexels.com/video-files/19453966/19453966-hd_1920_1080_30fps.mp4) |

所有素材页面均标注免费使用。[Pexels License](https://www.pexels.com/license/) 允许下载、修改以及网站使用；无需强制署名。本文件保留作者及来源方便追溯。人物素材不用于暗示其为站主或为站主背书。下载地址中的尺寸是 CDN 文件名；实际解码的肖像源为 1366 × 720，其余源为 1920 × 1080。最终成片统一为 1920 × 1080。

## 制作和验证

- 制作脚本：`tmp/cinematic/build_reel.py`
- 工具：FFmpeg 7.1，通过官方 PyPI `imageio-ffmpeg` 0.6.0 Windows wheel 提供
- 源镜头检查：`tmp/cinematic/source-contact-sheet.jpg` 和 `detail-contact-sheet.jpg`
- 最终 12 帧抽检：`tmp/cinematic/final-contact-sheet.jpg`，覆盖全部镜头、两处叠化、首尾帧
- 视频元数据：`tmp/cinematic/final-metadata.txt`
- 完整解码到空输出成功，退出码 0，无解码报错
- 检查了全部镜头的曝光、焦点、画面比例和转场，无额外水印或烧录文字

页面建议使用本地 MP4、静音循环播放，并保留暂停控件及减少动态效果的兼容处理。
