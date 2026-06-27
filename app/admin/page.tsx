'use client'

import { Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function FacilityDashboard() {
  const pendingBookings = [
    { id: 'BK001', type: 'Donor Screening', name: 'Maria Cruz', date: '2025-06-25 10:00 AM', status: 'pending' },
    { id: 'BK002', type: 'Recipient Request', name: 'Jessica Reyes', date: '2025-06-25 02:00 PM', status: 'pending' },
    { id: 'BK003', type: 'Donor Donation', name: 'Angela Santos', date: '2025-06-26 09:00 AM', status: 'pending' },
  ]

  const recentConfirmed = [
    { id: 'BK010', type: 'Donor Screening', name: 'Rosa Lopez', date: 'Confirmed', volume: '500ml', status: 'confirmed' },
    { id: 'BK011', type: 'Recipient Allocation', name: 'Carmen Flores', date: 'Confirmed', volume: '250ml', status: 'confirmed' },
    { id: 'BK012', type: 'Donor Donation', name: 'Sophie Reyes', date: 'Confirmed', volume: '300ml', status: 'confirmed' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Facility Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage donor and recipient booking requests</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-light-pink bg-light-pink/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">8</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="border-accent bg-[#FFF9F0]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Confirmed This Week</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">24</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
          </CardContent>
        </Card>

        <Card className="border-rose-accent bg-light-pink/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Action Required</CardTitle>
              <Clock className="h-4 w-4 text-rose-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-accent">3</div>
            <p className="text-xs text-muted-foreground mt-1">Requires your attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Booking Requests</CardTitle>
            <CardDescription>Requests awaiting confirmation from facility staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <div key={booking.id} className="flex items-start justify-between p-3 border border-light-pink rounded-lg bg-light-pink/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{booking.name}</span>
                      <Badge className="text-xs bg-primary hover:bg-primary text-white">{booking.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{booking.date}</p>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" render={<Link href={`/admin/bookings?id=${booking.id}`} />}>
                    Review
                  </Button>
                </div>
              ))}
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
            <CardDescription>Bookings processed this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConfirmed.map((booking) => (
                <div key={booking.id} className="flex items-start justify-between p-3 border border-accent rounded-lg bg-[#FFF9F0]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{booking.name}</span>
                      <Badge className="text-xs bg-accent hover:bg-accent text-white">{booking.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{booking.volume} allocated</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="outline" className="justify-start border-accent text-accent hover:bg-light-pink/30" render={<Link href="/admin/bookings?filter=screening" />}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Review Screenings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
