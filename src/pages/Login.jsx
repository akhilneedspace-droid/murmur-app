import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.toLowerCase().includes('invalid')) {
          setError('Incorrect email or password. Please try again.')
        } else {
          setError(error.message)
        }
        return
      }
      navigate('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ padding: '0 28px', justifyContent: 'space-between' }}>
      <div className="orb" style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)', top: '-60px', right: '-80px' }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Good to see you. Sign in and let's pick up where you left off.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Email address', value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com' },
              { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
            ].map(({ label, value, setter, type, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</label>
                <input type={type} value={value} onChange={e => { setter(e.target.value); setError('') }} placeholder={placeholder}
                  style={{ width: '100%', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)', transition: 'border-color var(--transition)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            ))}
          </div>

          {/* Forgot password link */}
          <div style={{ textAlign: 'right', marginTop: -8 }}>
            <button type="button" onClick={() => navigate('/forgot-password')}
              style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              Forgot password?
            </button>
          </div>

          {error && <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center', lineHeight: 1.5 }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
            New here?{' '}
            <button type="button" onClick={() => navigate('/')} style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              Create an account
            </button>
          </p>
        </form>
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}