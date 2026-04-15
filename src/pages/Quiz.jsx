import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

const QUESTIONS = [
  {
    q: "When something's weighing on you, you usually...",
    options: [
      "Keep it to myself until it passes",
      "Talk to someone I trust",
      "Write it down or find an outlet",
      "Honestly, I don't know"
    ]
  },
  {
    q: "When a friend is upset, your instinct is to...",
    options: [
      "Just listen — no fixing",
      "Help them find a solution",
      "I want to help but I freeze up"
    ]
  },
  {
    q: "Could you open up to a complete stranger?",
    options: [
      "Yes — easier than people I know",
      "Only if I was anonymous",
      "Not really, trust takes time"
    ]
  },
  {
    q: "What brought you here today?",
    options: [
      "I need to get something off my chest",
      "I want to be there for someone",
      "Just exploring, no particular reason"
    ]
  },
  {
    q: "Right now, in this moment — you feel...",
    options: [
      "Heavy. A lot is going on.",
      "Okay, just needed somewhere to land.",
      "Good — ready to show up for others.",
      "Somewhere in between, honestly."
    ]
  }
]

export default function Quiz() {
  const navigate = useNavigate()
  const { recordAnswer, computeIdentity, answers } = useQuiz()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [current])

  function handleSelect(optionIndex) {
    if (animating) return
    setSelected(optionIndex)
  }

  function handleNext() {
    if (selected === null || animating) return
    recordAnswer(current, selected)

    setAnimating(true)
    setVisible(false)

    setTimeout(() => {
      const updatedAnswers = [...answers]
      updatedAnswers[current] = selected

      if (current < QUESTIONS.length - 1) {
        setCurrent(c => c + 1)
        setSelected(null)
        setAnimating(false)
      } else {
        computeIdentity(updatedAnswers)
        navigate('/quiz/result')
      }
    }, 320)
  }

  function handleBack() {
    if (current === 0) { navigate('/'); return }
    setVisible(false)
    setTimeout(() => {
      setCurrent(c => c - 1)
      setSelected(answers[current - 1] ?? null)
      setAnimating(false)
    }, 220)
  }

  const q = QUESTIONS[current]
  const progress = ((current) / QUESTIONS.length) * 100

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'space-between' }}>

      {/* Background orb */}
      <div className="orb" style={{
        width: 340, height: 340,
        background: 'radial-gradient(circle, rgba(139,124,246,0.12) 0%, transparent 70%)',
        top: '-40px', left: '50%', transform: 'translateX(-50%)'
      }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingTop: '52px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        {/* Back + counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={handleBack} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--text-tertiary)', fontSize: 14,
            transition: 'color var(--transition)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {current + 1} of {QUESTIONS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 2,
          background: 'var(--border)',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progress + (100 / QUESTIONS.length)}%`,
            background: 'var(--accent)',
            borderRadius: 1,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 20,
        paddingTop: 32,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease'
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 6vw, 32px)',
          fontWeight: 400,
          lineHeight: 1.3,
          color: 'var(--text)',
          letterSpacing: '-0.01em'
        }}>
          {q.q}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`quiz-option ${selected === i ? 'selected' : ''}`}
              onClick={() => handleSelect(i)}
              style={{
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Next button */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingBottom: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div className="progress-dots">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={i === current ? 'active' : i < current ? 'done' : ''}
            />
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={selected === null}
          onClick={handleNext}
        >
          {current === QUESTIONS.length - 1 ? 'See my result' : 'Continue'}
        </button>
      </div>
    </div>
  )
}