/// <reference types="react" />

'use client'

import React from 'react'
import { useAuth } from '@/contexts/auth-context'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your admin account and system preferences</p>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-[18px] border border-border p-8 max-w-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Account Information</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full px-4 py-3.5 bg-muted border border-border rounded-xl text-foreground disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3.5 bg-muted border border-border rounded-xl text-foreground disabled:opacity-50"
            />
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              To change your account information, please contact the system administrator.
            </p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-[18px] border border-border p-8 max-w-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="text-2xl font-semibold text-foreground mb-6">System Information</h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">System Version</span>
            <span className="text-foreground font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Backend</span>
            <span className="text-foreground font-medium break-all">{process.env.NEXT_PUBLIC_API_URL}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
