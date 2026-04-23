import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Welcome() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="page" style={{ position: 'relative', justifyContent: 'space-between', minHeight: '100dvh' }}>

      <div className="orb" style={{ width: 420, height: 420, background: 'radial-gradient(circle, rgba(139,124,246,0.18) 0%, transparent 70%)', top: '-80px', right: '-100px' }} />
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(232,131,106,0.10) 0%, transparent 70%)', bottom: '120px', left: '-60px' }} />

      <div className="pill-container" style={{ position: 'relative', zIndex: 1, padding: '52px 28px 0', marginTop: '20vh', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-12px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', border: '1px solid rgba(139,124,246,0.25)', borderRadius: 20, background: 'rgba(139,124,246,0.08)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.04em' }}>
            Quiet space. Real feelin.
          </span>
        </div>
      </div>

      <div className="hero-content" style={{ position: 'relative', zIndex: 1, padding: '0 28px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 14vw, 76px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 24, color: 'var(--text)' }}>
            You are<br />
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>not alone.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 320 }}>
            A warm, safe space to say the things you've been holding in.
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 48px', display: 'flex', flexDirection: 'column', gap: 12, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Takes 2 minutes · No judgement · Always private</span>
        </div>
        <button className="btn-primary" style={{ fontSize: 17, padding: '18px 24px' }} onClick={() => navigate('/quiz')}>
          Get started
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline' }}>Sign in</button>
        </p>
      </div>
    </div>
  )
}