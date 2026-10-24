import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PortfolioMotion from './PortfolioMotion.jsx'
import './fonts.css'
import './styles.css'
import './art-direction.css'
import './cinematic-hero.css'
import './pointer-aura.css'
import './screening-room.css'
import './portfolio-motion.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /><PortfolioMotion /></React.StrictMode>,
)
