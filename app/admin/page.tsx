'use client'

import { useEffect, useState } from 'react'
import { Calendar, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

interface MilkBankRequest {
  id: number
  request_type: 'DONOR' | 'RECIPIENT'
  allocated_facility_name: string
  current_sub_status: string
  submitted_at: string
  preferred_date: string
  preferred_time: string
  owner_name: string
  owner_email: string
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  DONOR: 'Donor Screening',
  RECIPIENT: 'Recipient Request',
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_attendance: 'Awaiting Attendance',
  scheduled: 'Scheduled',
  counter_offered: 'Counter Offer Proposed',
  completed: 'Completed',
}

function isWithinLastDays(isoDate: string, days: number) {
  const then = new Date(isoDate).getTime()
  return Date.now() - then <= days * 24 * 60 * 60 * 1000
}

function isOverdue(preferredDate: string) {
  return new Date(`${preferredDate}T00:00:00`).getTime() < new Date().setHours(0, 0, 0, 0)
}

export default function FacilityDashboard() {
  const [requests, setRequests] = useState<MilkBankRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/milkbank/requests/all/')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load dashboard data (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pendingRequests = requests.filter((r) => r.current_sub_status === 'pending')
  const confirmedRequests = requests.filter(
    (r) => !['pending', 'declined', 'expired'].includes(r.current_sub_status)
  )
  const confirmedThisWeek = confirmedRequests.filter((r) => isWithinLastDays(r.submitted_at, 7))
  const overduePending = pendingRequests.filter((r) => isOverdue(r.preferred_date))

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your facility's activity and pending tasks</p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card size="sm" className="border-light-pink bg-white">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{isLoading ? '—' : pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card size="sm" className="border-accent bg-white">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed This Week</CardTitle>
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent/10">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{isLoading ? '—' : confirmedThisWeek.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted in the last 7 days</p>
          </CardContent>
        </Card>

        <Card size="sm" className="border-light-pink bg-white">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Action Required</CardTitle>
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{isLoading ? '—' : overduePending.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending past their preferred date</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Booking Requests</CardTitle>
              <CardDescription>Requests awaiting confirmation from facility staff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRequests.length > 0 ? (
                  pendingRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-start justify-between p-3 border border-light-pink rounded-lg bg-light-pink/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {request.owner_name || request.owner_email}
                          </span>
                          <Badge className="text-xs bg-primary hover:bg-primary text-white">
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {request.preferred_date} · {request.preferred_time}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white"
                        render={<Link href="/admin/bookings?tab=pending" />}
                      >
                        Review
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
                )}
              </div>
              <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-white" render={<Link href="/admin/bookings" />}>
                View All Requests
              </Button>
            </CardContent>
          </Card>

          {/* Recently Confirmed */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Confirmed</CardTitle>
              <CardDescription>Bookings accepted by the facility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {confirmedRequests.length > 0 ? (
                  confirmedRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-start justify-between p-3 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {request.owner_name || request.owner_email}
                          </span>
                          <Badge className="text-xs bg-green-500 hover:bg-green-500 text-white">
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {STATUS_LABELS[request.current_sub_status] || request.current_sub_status} at{' '}
                          {request.allocated_facility_name}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No confirmed bookings yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button className="justify-start bg-primary hover:bg-primary/90 text-white" render={<Link href="/admin/bookings" />}>
              <Calendar className="mr-2 h-4 w-4" />
              Manage Bookings
            </Button>
            <Button variant="outline" className="justify-start border-accent text-accent hover:bg-light-pink/30" render={<Link href="/admin/bookings?tab=confirmed" />}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Review Screenings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
