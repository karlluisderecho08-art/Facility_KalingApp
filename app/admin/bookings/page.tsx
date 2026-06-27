'use client'

import { useState } from 'react'
import { Check, X, Phone, Mail, MapPin, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function BookingRequests() {
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [proposeDate, setProposeDate] = useState('')
  const [proposeTime, setProposeTime] = useState('')
  const [proposeReason, setProposeReason] = useState('')
  const pendingRequests = [
    {
      id: 'BR001',
      type: 'Donor Screening',
      name: 'Maria Cruz',
      phone: '+63 917 123 4567',
      email: 'maria@email.com',
      location: 'Quezon City',
      date: '2025-06-25 10:00 AM',
      status: 'pending',
    },
    {
      id: 'BR002',
      type: 'Recipient Request',
      name: 'Jessica Reyes',
      phone: '+63 918 456 7890',
      email: 'jessica@email.com',
      location: 'Makati',
      date: '2025-06-25 02:00 PM',
      status: 'pending',
    },
    {
      id: 'BR003',
      type: 'Donor Screening',
      name: 'Angela Santos',
      phone: '+63 919 789 0123',
      email: 'angela@email.com',
      location: 'Las Piñas',
      date: '2025-06-26 09:00 AM',
      status: 'pending',
    },
  ]

  const confirmedRequests = [
    {
      id: 'BR010',
      type: 'Donor Screening',
      name: 'Rosa Lopez',
      phone: '+63 920 234 5678',
      email: 'rosa@email.com',
      location: 'Pasig',
      date: 'Confirmed - June 20',
      status: 'confirmed',
    },
    {
      id: 'BR011',
      type: 'Recipient Request',
      name: 'Carmen Flores',
      phone: '+63 921 567 8901',
      email: 'carmen@email.com',
      location: 'Taguig',
      date: 'Confirmed - June 21',
      status: 'confirmed',
    },
  ]

  const handleProposeSchedule = (request) => {
    setSelectedRequest(request)
    setProposeDate('')
    setProposeTime('')
    setProposeReason('')
  }

  const handleSubmitProposal = () => {
    if (proposeDate && proposeTime) {
      // Simulate sending proposal to user
      console.log(`Proposed new schedule to ${selectedRequest.name}:`, {
        date: proposeDate,
        time: proposeTime,
        reason: proposeReason,
      })
      setSelectedRequest(null)
    }
  }

  const RequestCard = ({ request, isPending }) => (
    <Card className={isPending ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20' : 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{request.name}</CardTitle>
              <Badge variant={request.type === 'Donor Screening' ? 'default' : 'secondary'}>
                {request.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{request.date}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2 bg-background/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{request.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{request.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{request.location}</span>
          </div>
        </div>

        {/* Actions */}
        {isPending ? (
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white">
              <Check className="h-4 w-4 mr-2" />
              Confirm
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleProposeSchedule(request)}
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-accent text-sm font-medium pt-2">
            <Check className="h-4 w-4" />
            Confirmed and scheduled
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Booking Requests</h1>
        <p className="text-muted-foreground mt-2">Confirm or decline donor screening and recipient requests</p>
      </div>

      {/* Propose Schedule Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose New Schedule</DialogTitle>
            <DialogDescription>
              Suggest a new date and time to {selectedRequest?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Request Info */}
            <div className="bg-light-pink/30 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Original Request:</p>
              <p className="text-sm font-medium text-foreground">{selectedRequest?.date}</p>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Proposed Date
              </label>
              <Input
                type="date"
                value={proposeDate}
                onChange={(e) => setProposeDate(e.target.value)}
                className="rounded-lg"
              />
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Proposed Time
              </label>
              <Input
                type="time"
                value={proposeTime}
                onChange={(e) => setProposeTime(e.target.value)}
                className="rounded-lg"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rescheduling (Optional)</label>
              <textarea
                value={proposeReason}
                onChange={(e) => setProposeReason(e.target.value)}
                placeholder="e.g., Facility maintenance, Staff availability..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedRequest(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleSubmitProposal}
              disabled={!proposeDate || !proposeTime}
            >
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({confirmedRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <RequestCard key={request.id} request={request} isPending={true} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No pending requests
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Confirmed Requests */}
        <TabsContent value="confirmed" className="space-y-4 mt-6">
          {confirmedRequests.length > 0 ? (
            confirmedRequests.map((request) => (
              <RequestCard key={request.id} request={request} isPending={false} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No confirmed requests
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
