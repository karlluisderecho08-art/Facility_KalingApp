'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { AlertCircle, LogIn } from 'lucide-react'
import Image from 'next/image'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { login, isLoading, error } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      router.push('/admin')
    } catch (err) {
      // Error is handled by context
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border px-7 py-6">
          {/* Logo + Wordmark + Divider — no gaps */}
          <div className="flex flex-col items-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-logo-kZ5dYwW0EczGiFN8WRQf0BUCupImzB.png"
              alt="KalingApp Logo"
              width={72}
              height={72}
            />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-wordmark-r6qrvdcpD2xyjlHXMcKFEoiqAyqI1Y.png"
              alt="KalingApp"
              width={150}
              style={{ marginTop: '-4px' }}
            />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-divider-JwnZPCojLzTTfh13Vz3lmyfQuukVgh.png"
              alt=""
              width={180}
              style={{ marginTop: '-2px' }}
            />
          </div>

          <div className="text-center mt-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Admin Sign In</h2>
            <p className="text-xs text-muted-foreground">Sign in to access the admin dashboard</p>
          </div>

          {/* Demo Credentials */}
          <div className="bg-light-pink/50 border border-primary/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-primary">Demo Credentials:</span>
              <br />
              Username: <span className="font-mono text-foreground">admin</span> · Password: <span className="font-mono text-foreground">admin123</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-[#FFDAD9] border border-destructive/30 rounded-xl p-3 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-primary hover:bg-[#E05F86] text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <LogIn className="h-5 w-5" />
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="flex flex-col items-center mt-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kalingapp-divider-JwnZPCojLzTTfh13Vz3lmyfQuukVgh.png"
              alt=""
              width={150}
              style={{ marginBottom: '4px' }}
            />
            <p className="text-[11px] text-muted-foreground">
              Secure Admin Access • KalingApp Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
