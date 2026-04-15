import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import { supabase } from '../lib/supabase.js'

export default function Signup() {
  const navigate = useNavigate()
  const { identity } = useQuiz()

  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [alreadyExists, setAlreadyExists] = useState(false)

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setError('')
    setAlreadyExists(false)
  }

  async function handleSubmitDetails(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('What should we call you?'); return }
    if (!form.email.includes('@')) { setError('Enter a valid email address.'); return }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name, identity } }
      })

      if (error) {
        // Already registered
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already exists') ||
            error.message.toLowerCase().includes('user already')) {
          setAlreadyExists(true)
          return
        }
        throw error
      }

      // Supabase returns a user with identities=[] if email already exists (no error thrown)
      if (data?.user && data.user.identities?.length === 0) {
        setAlreadyExists(true)
        return
      }

      setStep('verify')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index, val) {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[index] = val.slice(-1)
    setOtp(next)
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the full 6-digit code.'); return }
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: form.email, token: code, type: 'signup'
      })
      if (error) throw error

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.name,
        phone: form.phone,
        email: form.email,
        identity,
      })
      if (profileError && !profileError.message.includes('duplicate')) throw profileError

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ padding: '0 24px', justifyContent: 'space-between' }}>

      <div className="orb" style={{
        width: 320, height: 320,
        background: 'radial-gradient(circle, rgba(139,124,246,0.14) 0%, transparent 70%)',
        top: '-40px', left: '-60px'
      }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 52 }}>
        <button
          onClick={() => step === 'details' ? navigate('/quiz/result') : setStep('details')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 14 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28
      }}>

        {/* Already registered notice */}
        {alreadyExists && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(139,124,246,0.08)',
            border: '1px solid rgba(139,124,246,0.25)',
            borderRadius: 'var(--radius)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>
              Welcome back — you're already part of Murmur.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
              An account with this email already exists. Sign in to pick up where you left off.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Sign in instead
            </button>
          </div>
        )}

        {/* ── STEP 1: Details ── */}
        {step === 'details' && !alreadyExists && (
          <form onSubmit={handleSubmitDetails} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 8vw, 38px)',
                fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2
              }}>
                Create your account
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Verified accounts keep everyone safe. Your identity is always yours to control.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Your name', field: 'name', type: 'text', placeholder: 'What should we call you?' },
                { label: 'Email address', field: 'email', type: 'email', placeholder: 'your@email.com' },
                { label: 'Phone number', field: 'phone', type: 'tel', placeholder: '+61 4XX XXX XXX' },
                { label: 'Password', field: 'password', type: 'password', placeholder: 'At least 8 characters' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label style={{
                    display: 'block', fontSize: 13, color: 'var(--text-tertiary)',
                    marginBottom: 8, fontWeight: 500, letterSpacing: '0.03em'
                  }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={e => update(field, e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '14px 16px',
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', fontSize: 15, color: 'var(--text)',
                      transition: 'border-color var(--transition)'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending code...' : 'Send verification code'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
              By continuing you agree to our Terms of Service and Privacy Policy.
              Murmur is a peer support community, not a substitute for professional mental health care.
            </p>
          </form>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 8vw, 38px)',
                fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2
              }}>
                Check your email
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                We sent a 6-digit code to{' '}
                <strong style={{ color: 'var(--text)' }}>{form.email}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 48, height: 56, textAlign: 'center',
                    fontSize: 22, fontWeight: 500,
                    background: 'var(--bg2)',
                    border: `1px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                    transition: 'border-color var(--transition)'
                  }}
                />
              ))}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Didn't get it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => { setOtp(['','','','','','']); setStep('details'); setError('') }}
                style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline' }}
              >
                try again
              </button>
            </p>

            {error && (
              <p style={{ fontSize: 14, color: 'var(--coral)', textAlign: 'center' }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading || otp.join('').length < 6}>
              {loading ? 'Verifying...' : 'Verify & enter Murmur'}
            </button>

            <button type="button"
              onClick={() => { setStep('details'); setError('') }}
              style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', textDecoration: 'underline' }}
            >
              Wrong email? Go back
            </button>
          </form>
        )}
      </div>

      <div style={{ height: 48 }} />
    </div>
  )
}