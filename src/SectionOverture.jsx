import React from 'react'
import './section-overture.css'

export default function SectionOverture({ words, note }) {
  return <div className="section-overture">
    <h2 className="section-overture-title" aria-label={words.join(' ')}>
      {words.map((word, index) => <span className="motion-title-mask" key={word} aria-hidden="true"><span className={`motion-title-line${index === words.length - 1 ? ' is-outline' : ''}`}>{word}</span></span>)}
    </h2>
    {note && <span className="section-overture-note mono" data-motion-item>{note}</span>}
  </div>
}
