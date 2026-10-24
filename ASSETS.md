# 媒体素材说明

本项目为张依婷的剪辑师个人作品集基础版。`portrait.jpg` 为简历中的本人头像，`portrait-pixar.png` 为用户要求的皮克斯风格卡通衍生版本，由内置 ImageGen 根据原照生成。当前首页视频、背景和项目封面均为演示素材，用于预览排版与交互；它们不代表张依婷参与制作或完成的真实作品。上线前可用自己的项目视频、成片截图和封面替换同名文件。

## 文件清单

| 文件 | 尺寸 / 大小 | 内容 | 来源 |
| --- | --- | --- | --- |
| `public/portrait.jpg` | 921 × 1290，约 96 KB | 简历中的本人头像 | 用户提供的《张依婷-短视频剪辑.pdf》唯一嵌入图像，直接提取，无 AI 修改 |
| `public/hero.jpg` | 2400 × 1600，约 582 KB | 紫蓝色夜间城市街道，用作首页视频封面 | [Unsplash 原图 CDN](https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2400&q=86) |
| `public/automotive.jpg` | 1800 × 1200，约 303 KB | 黑色汽车行驶镜头，用作汽车类项目演示封面 | [Unsplash 原图 CDN](https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=88) |
| `public/fashion.jpg` | 1800 × 1200，约 255 KB | 时尚人物，用作服饰电商类项目演示封面 | [Unsplash 原图 CDN](https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=88) |
| `public/lifestyle.jpg` | 1800 × 1350，约 452 KB | 自然光家居空间，用作家居类项目演示封面 | [Unsplash 原图 CDN](https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=88) |
| `public/hero.mp4` | 1920 × 1080，25 fps，27.44 秒，18,875,028 字节 | 夜间城市交通，用作静音循环首页视频 | Max Avans / Pexels，[素材页面](https://www.pexels.com/video/video-of-city-traffic-at-night-5057439/)，[直接下载](https://videos.pexels.com/video-files/5057439/5057439-hd_1920_1080_25fps.mp4) |
| `public/hero-video-poster.jpg` | 1260 × 709，约 98 KB | 与首页视频对应的静态预览图，可选作视频 poster | Max Avans / Pexels，[视频预览图](https://images.pexels.com/videos/5057439/----5057439.jpeg?auto=compress&dpr=1&h=750&w=1260) |

图片下载参数仅控制分辨率和压缩质量；未对图片内容进行生成或重绘。所有素材均已保存在项目本地，页面运行时无需访问以上外部地址。

## 来源和替换

- Unsplash 图片按 [Unsplash License](https://unsplash.com/license) 提供。
- Pexels 视频素材页面标注为免费使用，参见 [Pexels License](https://www.pexels.com/license/)。视频作者为 Max Avans。
- `hero.mp4` 在页面中应使用 `autoPlay`、`muted`、`loop` 和 `playsInline`。页面需要保留暂停控件，并在用户要求减少动态效果时停用自动播放。
- 替换项目成片时，请同时更新页面内的“演示封面”提示和项目数据，避免将演示素材误认为真实作品。
