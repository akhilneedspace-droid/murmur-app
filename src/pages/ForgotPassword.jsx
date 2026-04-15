import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
      <div className="orb" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-40px', right: '-60px' }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
        <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to sign in
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        {sent ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>📬</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--accent)' }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 300 }}>
              We sent a password reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              It might take a minute — check your spam folder too.
            </p>
            <button onClick={() => navigate('/login')} className="btn-primary" style={{ maxWidth: 300, width: '100%' }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
                Forgot your password?
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                No worries. Enter your email and we'll send you a reset link right away.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)', transition: 'border-color var(--transition)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}