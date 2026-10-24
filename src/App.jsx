import React, { useEffect, useRef, useState } from 'react'
import { profile, stats, experiences, projects, advantages } from './content.js'
import { publicAsset } from './publicAsset.js'
import DraggablePortrait from './DraggablePortrait.jsx'
import CinematicHero, { CinematicHeader } from './CinematicHero.jsx'
import WorksCarousel from './WorksCarousel.jsx'
import PointerAura from './PointerAura.jsx'
import SectionOverture from './SectionOverture.jsx'

function Icon({ name = 'arrow', size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
    down: <><path d="M12 3v18m-7-7 7 7 7-7" /></>,
    play: <path d="m9 5 11 7-11 7Z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    close: <><path d="m6 6 12 12M6 18 18 6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    menu: <><path d="M4 8h16M4 16h16" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

function SectionLabel({ number, children, english }) {
  return <div className="section-label"><span className="section-number">{number}</span><span>{children}</span><span className="section-label-en">{english}</span></div>
}

function VideoDialog({ project, onClose, customVideo, onUpload }) {
  const dialogRef = useRef(null)
  const videoRef = useRef(null)
  const [playbackError, setPlaybackError] = useState(false)
  const [size, setSize] = useState({ width: project.width || 16, height: project.height || 9 })
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  const isPortrait = size.width < size.height
  return <dialog className={`video-dialog screening-dialog ${isPortrait ? 'is-portrait' : 'is-landscape'}`} style={{ '--screen-ratio': size.width / size.height }} ref={dialogRef} onCancel={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose() }} aria-labelledby="video-title">
    <div className="dialog-inner">
      <div className="dialog-top"><span className="mono">YITING EDITS / SCREENING ROOM</span><button className="icon-button" onClick={onClose} aria-label="关闭视频"><Icon name="close" /></button></div>
      <div className="screening-layout">
        <div className="screening-stage">
          <img className="screening-ambient" src={project.image} alt="" aria-hidden="true" />
          <video ref={videoRef} key={customVideo?.url || project.id} className="project-video" src={customVideo?.url || project.video} poster={project.image} controls autoPlay playsInline preload="metadata" onError={() => setPlaybackError(true)} onLoadedData={() => setPlaybackError(false)} onLoadedMetadata={(event) => setSize({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight })} aria-label={`${project.title} 完整作品`} />
        </div>
        <aside className="screening-info">
          <span className="screening-number mono">FILM {project.number} / SELECTED WORKS</span>
          <span className="project-category">{project.category}</span>
          <h2 id="video-title">{project.title}</h2>
          <p className="screening-summary">{customVideo ? `${customVideo.name} · 当前浏览器临时预览` : project.summary}</p>
          {playbackError && <p className="playback-error" role="alert">视频暂时无法播放。可以重新打开，或选择浏览器支持的 MP4 / WebM 文件。</p>}
          <div className="screening-metrics">{project.metrics?.map((metric) => <span key={metric}>{metric}</span>)}</div>
          <div className="screening-original"><span className="mono">ORIGINAL FILE</span><p>{customVideo?.name || project.sourceName || project.title}</p></div>
          <div className="screening-tags">{project.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <button className="button button-secondary" onClick={() => onUpload(project.id)}><Icon name="upload" size={17} />预览其他本地视频</button>
          <span className="screening-tip">点击画面播放，支持声音、进度和全屏。<br />按 Esc 关闭放映。</span>
        </aside>
      </div>
    </div>
  </dialog>
}

export default function App() {

  const [activeProject, setActiveProject] = useState(null)
  const [customVideos, setCustomVideos] = useState({})

  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const fileInputRef = useRef(null)
  const uploadProjectRef = useRef(null)
  const localURLs = useRef([])
  const toastTimer = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => {
    return () => {
      localURLs.current.forEach(URL.revokeObjectURL)
      clearTimeout(toastTimer.current)
      clearTimeout(copyTimer.current)
    }
  }, [])

  function notify(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 4500)
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2500)
    } catch {
      notify(`邮箱：${profile.email}`)
    }
  }

  function uploadVideo(projectId) {
    uploadProjectRef.current = projectId || projects[0].id
    fileInputRef.current.click()
  }

  function onFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { notify('请选择 MP4、WebM 或其他浏览器支持的视频文件。'); return }
    const id = uploadProjectRef.current
    const url = URL.createObjectURL(file)
    localURLs.current.push(url)
    setCustomVideos((current) => ({ ...current, [id]: { url, name: file.name } }))
    setActiveProject(projects.find((project) => project.id === id))
    notify('已载入本地作品，仅在当前浏览器预览。')
    event.target.value = ''
  }

  return <>
    <a className="skip-link" href="#works">跳转至剪辑作品</a>
    <PointerAura />
    <CinematicHeader />

    <main>
      <CinematicHero />

      <section id="about" className="about-section section-pad" data-motion-section>
        <div className="container">
          <SectionOverture words={['BEHIND THE', 'CUT.']} note="THE EDITOR / THE INSTINCT / THE STORY" />
          <SectionLabel number="01" english="ABOUT THE EDITOR">镜头背后</SectionLabel>
          <div className="about-grid">
            <div className="portrait-motion-frame" data-motion-image><DraggablePortrait src={publicAsset('images/yiting-portrait.webp')} alt="长发、米白色针织衣服与银色金属框眼镜的正面静态头像" /></div>
            <div className="about-content" data-motion-item><p className="small-eyebrow">你好，我是张依婷</p><h2>把素材变成故事，<br />把想法<span className="muted-text">剪成画面。</span></h2><p className="about-intro">专注商业短视频与个人 IP 内容的剪辑创作。从汽车贴膜门店到旗袍、家纺场景，我用节奏、声音与画面，呈现每个品牌独有的表达。</p><p className="about-intro">熟练使用剪映专业版，能独立完成素材筛选、粗剪精剪、节奏卡点、音效字幕及调色。也关注发布后的数据，让每一次创作都有新的进步。</p>
              <div className="about-meta"><div><span>专业背景</span><p>信阳艺术职业学院 · 影视多媒体技术</p></div><div><span>工作方向</span><p>商业短视频 / 个人 IP / 拍摄与后期</p></div></div>
              <div className="about-contact"><a href={`mailto:${profile.email}`}>{profile.email}<Icon size={15} /></a><a className="resume-link" href={publicAsset('resume.pdf')} target="_blank" rel="noreferrer">查看完整简历<Icon size={14} /></a></div>
            </div>
          </div>
          <div className="stats-row" data-motion-group>{stats.map((stat, index) => <div className="stat" key={stat.label} data-motion-item><span className="stat-index mono">/ 0{index + 1}</span><div className="stat-number">{stat.value}<span>{stat.suffix}</span></div><h3>{stat.label}</h3><p>{stat.detail}</p></div>)}</div>
          <div className="experience-block"><div className="experience-label" data-motion-item><span className="small-eyebrow">沿途的积累</span><h3>我的经历<span className="mono">EXPERIENCE</span></h3></div><div className="experience-list" data-motion-group>{experiences.map((experience) => <article className="experience-item" key={experience.company} data-motion-item><span className="experience-period mono">{experience.period}</span><div><h4>{experience.company}</h4><span className="experience-role">{experience.role}</span><p>{experience.description}</p><div className="text-tags">{experience.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}</div></div>
        </div>
      </section>

      <section id="works" className="work-section section-pad" data-motion-section>
        <div className="container">
          <SectionOverture words={['SELECTED', 'FILMS.']} note="A COLLECTION OF MOMENTS / FRAME BY FRAME" />
          <SectionLabel number="02" english="SELECTED FILMS">精选剪辑</SectionLabel>
          <WorksCarousel projects={projects} customVideos={customVideos} onOpen={setActiveProject} onUpload={uploadVideo} />
        </div>
      </section>

      <section id="strengths" className="strength-section section-pad" data-motion-section>
        <div className="container"><SectionOverture words={['THE CREATIVE', 'EYE.']} note="FEEL THE RHYTHM / FIND THE DETAIL" /><SectionLabel number="03" english="WHAT I BRING">我的优势</SectionLabel><div className="section-heading" data-motion-item><div><h2>不止于剪，<br />更在于<span className="muted-text">理解。</span></h2></div><p className="strength-intro">理解内容的目的，也理解观众的情绪。<br />让创意与表达，在剪辑台上相遇。</p></div>
          <div className="strength-grid" data-motion-group>{advantages.map((advantage, index) => <article className="strength-card" key={advantage.title} data-motion-item><div className="strength-card-top"><span className="mono">0{index + 1} /</span><span className={`capability-symbol symbol-${index}`} aria-hidden="true">{index === 0 ? '↔' : index === 1 ? '◉' : index === 2 ? '≋' : '↗'}</span></div><span className="strength-english mono">{advantage.english}</span><h3>{advantage.title}</h3><p>{advantage.description}</p><div className="strength-tags">{advantage.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>
          <div className="tools-strip" data-motion-item><span className="mono">MY CREATIVE TOOLKIT</span><div><span className="tool-icon">剪</span><span>剪映专业版</span><span className="tool-divider" /><span>脚本 & 分镜</span><span className="tool-divider" /><span>拍摄 & 后期</span><span className="tool-divider" /><span>AIGC 创作学习</span></div><span className="tools-note">让工具服务于表达</span></div>
        </div>
      </section>

      <section id="contact" className="contact-section" data-motion-section>
        <div className="container contact-inner">
          <SectionOverture words={["LET’S MAKE", 'IT MOVE.']} note="YOUR NEXT STORY / STARTS WITH A CONVERSATION" />
          <SectionLabel number="04" english="LET’S CREATE SOMETHING">保持联系</SectionLabel>
          <div className="contact-content">
            <div className="availability" data-motion-item><span className="status-dot" />期待下一次创作机会</div>
            <h2 data-motion-item>下一支好片，<br />从一次<span className="contact-word">对话<svg viewBox="0 0 320 20" aria-hidden="true"><path d="M3 15Q140-5 316 9" /></svg></span>开始<span className="contact-period">。</span></h2>
            <div className="contact-action-motion" data-motion-item><a className="contact-cta" href={`mailto:${profile.email}`}><span>一起，剪出新的可能。</span><span className="contact-circle"><Icon size={34} /></span></a></div>
            <div className="contact-details" data-motion-group>
              <div data-motion-item><span className="mono">EMAIL ME</span><div className="email-line"><a href={`mailto:${profile.email}`}>{profile.email}</a><button className="icon-button" onClick={copyEmail} aria-label={copied ? '邮箱已复制' : '复制邮箱'}><Icon name={copied ? 'check' : 'copy'} size={17} /></button>{copied && <span className="copied-label">已复制</span>}</div></div>
              <div data-motion-item><span className="mono">GIVE ME A CALL</span><a href={`tel:${profile.phone}`}>{profile.phone}</a></div>
              <div data-motion-item><span className="mono">BASED IN</span><p>苏州，中国<span className="contact-clock">UTC +08:00</span></p></div>
            </div>
          </div>
          <footer className="site-footer" data-motion-item><a className="footer-brand" href="#home">YITING EDITS<span>© 2026 张依婷</span></a><span className="mono footer-note">MADE WITH CARE. EDITED WITH FEELING.</span><a className="back-top" href="#home">回到顶部<Icon name="down" size={15} /></a></footer>
        </div>
      </section>
    </main>
    <input ref={fileInputRef} type="file" accept="video/*" onChange={onFileChange} hidden aria-label="选择本地剪辑作品" />
    {activeProject && <VideoDialog project={activeProject} onClose={() => setActiveProject(null)} customVideo={customVideos[activeProject.id]} onUpload={uploadVideo} />}
    <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast}</div>
  </>
}
