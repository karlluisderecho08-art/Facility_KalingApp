'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError, requestPasswordReset, resetPassword } from '@/lib/api'

// The server's rule for a staff password (Backend_KalingApp/accounts/
// passwords.py): a staff login reads mothers' health records.
const MIN_LENGTH = 12
// The server sends at most one code a minute (RESEND_COOLDOWN_SECONDS).
const RESEND_WAIT_SECONDS = 60
// How long an emailed code works (VERIFICATION_CODE_TTL_MINUTES).
const CODE_MINUTES = 15

type Step = 'email' | 'code' | 'done'

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed'

function message(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.'
}

/**
 * "Forgot password?" for facility staff: a 6-digit code is emailed to the
 * account's address, and with it they choose a new password. Afterwards they
 * sign in as usual -- the reset itself doesn't sign them in here.
 *
 * Staff whose login has no inbox they can read (the seeded @kalingapp.demo
 * addresses, for one) ask their KalingApp admin instead, who can set a new
 * password from the admin portal.
 */
export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const sendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setStep('code')
      setResendIn(RESEND_WAIT_SECONDS)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const submitEmail = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim()) sendCode()
  }

  const submitNewPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the email.')
      return
    }
    if (password.length < MIN_LENGTH) {
      setError(`Your new password needs at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords are not the same.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword(email.trim(), code.trim(), password)
      setPassword('')
      setConfirm('')
      setCode('')
      setStep('done')
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="glass bg-glass rounded-[20px] shadow-glass border border-glass-rim px-7 py-6">
          <div className="flex flex-col items-center">
            <img src="/kalingapp-logo.png" alt="KalingApp Logo" width={60} height={60} />
            <img src="/kalingapp-wordmark.png" alt="KalingApp" width={130} style={{ marginTop: '6px' }} />
          </div>

          <div className="text-center mt-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {step === 'done' ? 'Password changed' : 'Reset your password'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === 'email' && "Enter your facility sign-in email and we'll send you a 6-digit code."}
              {step === 'code' && 'Enter the code from the email and choose a new password.'}
              {step === 'done' && 'Sign in with your new password.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 bg-[#FFDAD9] border border-destructive/30 rounded-xl p-3 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={submitEmail} className="space-y-3.5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="username"
                  autoFocus
                  disabled={busy}
                  className={inputClass}
                />
              </div>
              <Button
                type="submit"
                disabled={busy || !email.trim()}
                className="w-full bg-primary hover:bg-[#E05F86] text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                {busy ? 'Sending...' : 'Send code'}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={submitNewPassword} className="space-y-3.5">
              <div className="rounded-xl bg-white/70 border border-border px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                If <span className="font-medium text-foreground break-all">{email.trim()}</span> has a KalingApp
                account, a code is on its way. It works for {CODE_MINUTES} minutes. Check the spam folder too.
              </div>
              <div>
                <label htmlFor="reset-code" className="block text-sm font-medium text-foreground mb-1">
                  6-digit code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  disabled={busy}
                  className={`${inputClass} tracking-[0.3em] font-mono`}
                />
              </div>
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-foreground mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={visible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${MIN_LENGTH} characters`}
                    autoComplete="new-password"
                    disabled={busy}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:bg-light-pink"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    title={visible ? 'Hide password' : 'Show password'}
                  >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-foreground mb-1">
                  Type it again
                </label>
                <input
                  id="reset-confirm"
                  type={visible ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                  className={inputClass}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                At least {MIN_LENGTH} characters. Not a common password, not only numbers, and not too like your
                email. Changing it signs you out on every other device.
              </p>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-primary hover:bg-[#E05F86] text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <KeyRound className="h-5 w-5" />
                {busy ? 'Saving...' : 'Set new password'}
              </Button>
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setError(null)
                  }}
                  disabled={busy}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy || resendIn > 0}
                  className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Your password has been changed, and any other device signed in to this account has been signed out.</p>
              </div>
              <Link
                href="/login"
                className="w-full bg-primary hover:bg-[#E05F86] text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {step !== 'done' && (
            <div className="mt-5 space-y-3 text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Can&apos;t get email at this address? Your KalingApp admin can set a new password for you.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
