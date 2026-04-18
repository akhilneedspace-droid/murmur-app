import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    // Check for an existing session immediately — covers the "second click" case
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) { setReady(true); return }

      // Check URL hash for error vs token
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        // Token is present — Supabase will process it via onAuthStateChange
        return
      }
      if (hash.includes('error=access_denied') || hash.includes('otp_expired')) {
        setExpired(true)
      }
    })

    // Listen for Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setReady(true)
        setExpired(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Password updated</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.6)', lineHeight: 1.7 }}>Taking you home in a moment...</p>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="page" style={{ padding: '0 28px', justifyContent: 'center', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⏱️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--text)' }}>Link expired</h2>
        <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.6)', lineHeight: 1.7, maxWidth: 300 }}>
          This reset link has expired or already been used. Request a new one and use it within 24 hours.
        </p>
        <button className="btn-primary" style={{ maxWidth: 280 }} onClick={() => navigate('/forgot-password')}>
          Request a new link
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
        <p style={{ fontSize: 13, color: 'rgba(240,239,232,0.4)' }}>Verifying your link...</p>
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
      <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-40px', left: '-60px' }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
              Choose a new password
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(240,239,232,0.65)', lineHeight: 1.6 }}>
              Make it something you'll remember — at least 8 characters.
            </p>
          </div>
          {[
            { label: 'New password', value: password, setter: setPassword, placeholder: 'At least 8 characters' },
            { label: 'Confirm password', value: confirm, setter: setConfirm, placeholder: 'Same password again' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(240,239,232,0.5)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</label>
              <input type="password" value={value} onChange={e => { setter(e.target.value); setError('') }} placeholder={placeholder}
                style={{ width: '100%', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)', transition: 'border-color var(--transition)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
          ))}
          {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}