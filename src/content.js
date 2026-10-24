import portfolioMedia from './portfolio-media.json'
import { publicAsset } from './publicAsset.js'

export const profile = {
  name: '张依婷',
  role: '短视频剪辑师',
  city: '苏州',
  email: '3622812764@qq.com',
  phone: '17724900931',
  intro: '把零散的素材，剪成有节奏、有情绪、让人愿意看下去的故事。专注商业短视频与个人 IP 内容，从脚本、拍摄到后期剪辑，关注每一个让表达更准确的细节。',
  education: '信阳艺术职业学院 · 影视多媒体技术',
  educationDetail: '大专 · 2024.09 — 至今 · GPA 3.66 / 4 · 专业前 5%',
};

export const stats = [
  {
    value: '110',
    suffix: '+',
    label: '短视频创作',
    detail: '汽车贴膜与服装家纺项目累计',
  },
  {
    value: '5',
    suffix: '万',
    label: '单条最高播放',
    detail: '汽车贴膜项目视频表现',
  },
  {
    value: '25',
    suffix: '%',
    label: '完播与互动提升',
    detail: '汽车贴膜项目简历记录',
  },
];

export const experiences = [
  {
    period: '2026.07 — 2026.10',
    company: '苏州我爱我车汽车贴膜',
    role: '视频剪辑师',
    description: '围绕汽车贴膜业务完成 60 条短视频剪辑，呈现施工过程与产品细节。结合内容反馈调整剪辑节奏，单条最高播放 5 万，完播率与互动率提升 25%。',
    tags: ['商业短视频', '产品细节', '节奏剪辑', '数据反馈'],
  },
  {
    period: '2026.04 — 2026.07',
    company: '服装 / 家纺内容项目',
    role: '拍摄兼剪辑师',
    description: '参与老板个人 IP 的口播、剧情及搞笑类内容创作，同时拍摄剪辑旗袍、家纺相关短视频，累计完成 50 余条内容。',
    tags: ['个人 IP', '口播剧情', '服装家纺', '拍摄剪辑'],
  },
];

export const projects = portfolioMedia.map((media, index) => {
  const portrait = media.orientation === 'portrait'
  const durationLabel = `${String(Math.floor(media.duration / 60)).padStart(2, '0')}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}`
  return {
    ...media,
    video: media.video ? publicAsset(media.video) : undefined,
    previewVideo: media.previewVideo ? publicAsset(media.previewVideo) : undefined,
    image: media.image ? publicAsset(media.image) : undefined,
    ambientImage: media.ambientImage ? publicAsset(media.ambientImage) : undefined,
    number: String(index + 1).padStart(2, '0'),
    title: portrait ? media.title.replace('改', ' · 修订版').replace(/^月二第/, '月二 · 第') : '电影片段混剪',
    category: portrait ? '剧情短视频' : '电影片段混剪',
    filter: portrait ? '竖屏作品' : '横屏作品',
    subtitle: `${portrait ? '9:16 竖屏' : '4:3 横屏'} / ${durationLabel}`,
    durationLabel,
    year: durationLabel,
    tags: [portrait ? '9:16 竖屏' : '4:3 横屏', portrait ? '剧情剪辑' : '电影混剪', '完整成片'],
    summary: portrait
      ? '剧情短视频剪辑，以人物表演、对白与画面衔接推进故事。保留 9:16 竖屏画面，点击观看完整有声版本。'
      : '电影片段混剪，通过镜头衔接与声音组织串联画面。保留原有 4:3 横屏画幅，点击观看完整有声版本。',
    metrics: [`时长 ${durationLabel}`, `${media.width} × ${media.height}`, portrait ? '9:16 竖屏' : '4:3 横屏'],
    process: [],
  }
})

export const advantages = [
  {
    number: '01',
    title: '剪出节奏，也留住情绪',
    english: 'RHYTHM & STORY',
    description: '从粗剪结构到精剪细节，关注画面衔接、音乐卡点和情绪推进，让每个镜头都服务于内容表达。',
    tags: ['粗剪 / 精剪', '节奏卡点', '画面衔接'],
  },
  {
    number: '02',
    title: '让声音与画面一起表达',
    english: 'DETAIL & FINISH',
    description: '使用剪映专业版完成字幕、音效与调色，兼顾信息可读性和画面统一，让成片更完整。',
    tags: ['剪映专业版', '音效字幕', '基础调色'],
  },
  {
    number: '03',
    title: '从拍摄之前，就开始思考',
    english: 'SCRIPT & SHOOT',
    description: '结合分镜与脚本梳理内容，参与人物和产品拍摄，提前考虑素材如何连接，减少后期表达的断点。',
    tags: ['分镜 / 脚本', '拍摄执行', '个人 IP'],
  },
  {
    number: '04',
    title: '让每次反馈，成为下一次进步',
    english: 'CONTENT & INSIGHT',
    description: '关注热点、封面与内容数据，根据播放和互动反馈复盘剪辑节奏，持续调整短视频的呈现方式。',
    tags: ['热点捕捉', '封面制作', '数据反馈'],
  },
];
