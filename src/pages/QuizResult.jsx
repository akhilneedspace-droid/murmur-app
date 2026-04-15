import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

const IDENTITIES = {
  carrier: {
    label: 'The Carrier',
    tagline: 'You hold a lot. This is where you put it down.',
    description: "You tend to carry things quietly — processing alone, pushing through. You're used to managing your own weight. Murmur is your space to finally say the thing out loud, at your own pace, as much or as little as you need.",
    trait: 'Your natural mode: Expresser',
    color: 'var(--accent)',
    dimColor: 'var(--accent-dim)',
    symbol: '◎',
  },
  anchor: {
    label: 'The Anchor',
    tagline: "You're the one people come to. That's a gift.",
    description: "You have a natural steadiness that draws people in. Being present for someone in pain comes naturally to you — you know how to hold space without trying to fix everything. On Murmur, that becomes something real.",
    trait: 'Your natural mode: Listener',
    color: 'var(--teal)',
    dimColor: 'rgba(93,202,165,0.12)',
    symbol: '⌖',
  },
  wanderer: {
    label: 'The Wanderer',
    tagline: 'Some days you carry, some days you hold others.',
    description: "You live in the in-between — sometimes you need to talk, sometimes you want to listen. Both are valid, both matter. Murmur lets you choose your mode every time you arrive. No fixed role. Just whatever you need today.",
    trait: 'Your natural mode: Fluid',
    color: 'var(--coral)',
    dimColor: 'rgba(232,131,106,0.12)',
    symbol: '◈',
  }
}

export default function QuizResult() {
  const navigate = useNavigate()
  const { identity } = useQuiz()
  const [visible, setVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  useEffect(() => {
    if (!identity) { navigate('/quiz'); return }
    const t1 = setTimeout(() => setVisible(true), 100)
    const t2 = setTimeout(() => setCardVisible(true), 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [identity, navigate])

  if (!identity) return null
  const id = IDENTITIES[identity]

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'space-between' }}>

      {/* Orb matching identity color */}
      <div className="orb" style={{
        width: 400, height: 400,
        background: `radial-gradient(circle, ${id.dimColor.replace('0.12', '0.22')} 0%, transparent 70%)`,
        top: '-60px', right: '-80px'
      }} />

      {/* Top label */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingTop: '52px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease'
      }}>
        <span style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 500
        }}>
          Your echo identity
        </span>
      </div>

      {/* Identity card */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        opacity: cardVisible ? 1 : 0,
        transform: cardVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease'
      }}>
        {/* Symbol */}
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: id.dimColor,
          border: `1px solid ${id.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          color: id.color,
          animation: 'float 4s ease-in-out infinite'
        }}>
          {id.symbol}
        </div>

        {/* Name + tagline */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 10vw, 52px)',
            fontWeight: 400,
            color: id.color,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 10
          }}>
            {id.label}
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            lineHeight: 1.5
          }}>
            {id.tagline}
          </p>
        </div>

        {/* Description card */}
        <div className="card" style={{ borderColor: `${id.color}25`, background: id.dimColor }}>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.75
          }}>
            {id.description}
          </p>
        </div>

        {/* Trait pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 20,
          background: id.dimColor,
          border: `1px solid ${id.color}30`,
          width: 'fit-content'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: id.color }} />
          <span style={{ fontSize: 13, color: id.color, fontWeight: 500 }}>{id.trait}</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingBottom: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: cardVisible ? 1 : 0,
        transition: 'opacity 0.6s ease 0.2s'
      }}>
        <button
          className="btn-primary"
          style={{ background: id.color, fontSize: 16, padding: '18px 24px' }}
          onClick={() => navigate('/signup')}
        >
          Create my account
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
          Your identity is private — only you can see it.
        </p>
      </div>
    </div>
  )
}