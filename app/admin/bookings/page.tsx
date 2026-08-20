'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, X, Phone, Mail, MapPin, Eye, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const DECLINE_REASONS = ['No Available Doctor', 'Outdated Serological Test']

export default function BookingRequests() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'pending'

  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 'BR001',
      type: 'Donor Screening',
      name: 'Maria Cruz',
      phone: '+63 917 123 4567',
      email: 'maria@email.com',
      location: 'Quezon City',
      date: '2025-06-25 10:00 AM',
      status: 'pending',
      questionnaire: [
        { question: 'Have you donated blood in the last 3 months?', answer: 'No' },
        { question: 'Do you have any chronic illnesses?', answer: 'No' },
        { question: 'Are you currently taking any medications?', answer: 'Vitamins only' },
        { question: 'Have you traveled outside the country in the last 6 months?', answer: 'No' },
      ],
      serology: {
        testDate: '2025-06-10',
        imageUrl: '/placeholder.jpg',
        expired: false,
      },
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
      questionnaire: [
        { question: 'What is the reason for the blood request?', answer: 'Scheduled surgery' },
        { question: 'What blood type is required?', answer: 'O+' },
        { question: 'How many units are needed?', answer: '2' },
      ],
      serology: {
        testDate: '2024-11-02',
        imageUrl: '/placeholder.jpg',
        expired: true,
      },
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
      questionnaire: [
        { question: 'Have you donated blood in the last 3 months?', answer: 'No' },
        { question: 'Do you have any chronic illnesses?', answer: 'Asthma (controlled)' },
        { question: 'Are you currently taking any medications?', answer: 'None' },
        { question: 'Have you traveled outside the country in the last 6 months?', answer: 'Yes - Japan' },
      ],
      serology: {
        testDate: '2025-06-15',
        imageUrl: '/placeholder.jpg',
        expired: false,
      },
    },
  ])

  const [confirmedRequests, setConfirmedRequests] = useState([
    {
      id: 'BR010',
      type: 'Donor Screening',
      name: 'Rosa Lopez',
      phone: '+63 920 234 5678',
      email: 'rosa@email.com',
      location: 'Pasig',
      date: 'Confirmed - June 20',
      status: 'confirmed',
      questionnaire: [
        { question: 'Have you donated blood in the last 3 months?', answer: 'No' },
        { question: 'Do you have any chronic illnesses?', answer: 'No' },
      ],
      serology: {
        testDate: '2025-06-01',
        imageUrl: '/placeholder.jpg',
        expired: false,
      },
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
      questionnaire: [
        { question: 'What is the reason for the blood request?', answer: 'Anemia treatment' },
        { question: 'What blood type is required?', answer: 'A-' },
      ],
      serology: {
        testDate: '2025-05-28',
        imageUrl: '/placeholder.jpg',
        expired: false,
      },
    },
  ])

  const [declinedRequests, setDeclinedRequests] = useState([])

  const [detailsRequest, setDetailsRequest] = useState(null)

  const [declineRequest, setDeclineRequest] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [declineNotes, setDeclineNotes] = useState('')

  const handleConfirm = (request) => {
    // TODO: replace with API call
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id))
    // TODO: replace with API call
    setConfirmedRequests((prev) => [...prev, { ...request, status: 'confirmed' }])
  }

  const handleOpenDecline = (request) => {
    setDeclineRequest(request)
    setDeclineReason('')
    setDeclineNotes('')
  }

  const handleSubmitDecline = () => {
    if (!declineReason || !declineRequest) return
    // TODO: replace with API call
    setPendingRequests((prev) => prev.filter((r) => r.id !== declineRequest.id))
    // TODO: replace with API call
    setDeclinedRequests((prev) => [
      ...prev,
      { ...declineRequest, status: 'declined', declineReason, declineNotes },
    ])
    setDeclineRequest(null)
  }

  const RequestCard = ({ request, variant }) => {
    const borderClasses =
      variant === 'pending'
        ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20'
        : variant === 'confirmed'
        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20'
        : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'

    return (
      <Card className={borderClasses}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{request.name}</CardTitle>
                <Badge variant={request.type === 'Donor Screening' ? 'default' : 'secondary'}>
                  {request.type}
                </Badge>
                {request.serology?.expired && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Serology Expired
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{request.date}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Information */}
          <div className="space-y-2 p-3 rounded-lg">
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

          {variant === 'declined' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Decline Reason</p>
              <p className="text-sm font-medium text-destructive">{request.declineReason}</p>
              {request.declineNotes && (
                <p className="text-sm text-muted-foreground">{request.declineNotes}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDetailsRequest(request)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {variant === 'pending' && (
              <>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleConfirm(request)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenDecline(request)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
          </div>

          {variant === 'confirmed' && (
            <div className="flex items-center gap-2 text-accent text-sm font-medium pt-2">
              <Check className="h-4 w-4" />
              Confirmed and scheduled
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Booking Requests</h1>
        <p className="text-muted-foreground mt-2">Confirm or decline donor screening and recipient requests</p>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!detailsRequest} onOpenChange={(open) => !open && setDetailsRequest(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailsRequest?.name}</DialogTitle>
            <DialogDescription>
              {detailsRequest?.type} • {detailsRequest?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Questionnaire */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Questionnaire</h3>
              <div className="space-y-3">
                {detailsRequest?.questionnaire?.map((qa, index) => (
                  <div key={index} className="space-y-0.5">
                    <p className="text-sm text-muted-foreground">{qa.question}</p>
                    <p className="text-sm font-medium">{qa.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Serology Results */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Serology Results</h3>
                {detailsRequest?.serology?.expired && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expired
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Test Date: {detailsRequest?.serology?.testDate}
              </p>
              {detailsRequest?.serology?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailsRequest.serology.imageUrl}
                  alt="Serology test result"
                  className="w-full rounded-lg border border-border"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={!!declineRequest} onOpenChange={(open) => !open && setDeclineRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Decline the request from {declineRequest?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a reason</option>
                {DECLINE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <textarea
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Additional details for this decline..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineRequest(null)}>
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleSubmitDecline}
              disabled={!declineReason}
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({confirmedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <RequestCard key={request.id} request={request} variant="pending" />
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
              <RequestCard key={request.id} request={request} variant="confirmed" />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No confirmed requests
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Declined Requests */}
        <TabsContent value="declined" className="space-y-4 mt-6">
          {declinedRequests.length > 0 ? (
            declinedRequests.map((request) => (
              <RequestCard key={request.id} request={request} variant="declined" />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No declined requests
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
