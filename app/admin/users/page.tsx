'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, Mail, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface StaffUser {
  id: number
  email: string
  mom_name: string
  baby_name: string
  baby_age_weeks: number | null
  breastfeeding_status: string
  baby_birth_date: string | null
  pediatric_clinic: string
  tracking_streaks: number
  total_drawn_oz: number
  location_consent_given: boolean
  is_active: boolean
  date_joined: string
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailsUser, setDetailsUser] = useState<StaffUser | null>(null)
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadUsers = () => {
    setIsLoading(true)
    setLoadError(null)
    apiFetch('/auth/users/')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
        return res.json()
      })
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.mom_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeCount = users.filter((u) => u.is_active).length
  const locationSharedCount = users.filter((u) => u.location_consent_given).length

  const handleToggleActive = async (user: StaffUser) => {
    setActionError(null)
    setPendingToggleId(user.id)
    try {
      const res = await apiFetch(`/auth/users/${user.id}/${user.is_active ? 'deactivate' : 'activate'}/`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Could not update this user')
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this user')
    } finally {
      setPendingToggleId(null)
    }
  }

  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <Badge className="bg-chart-2 hover:bg-chart-2">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Inactive
      </Badge>
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">View and manage all registered mothers</p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!detailsUser} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detailsUser?.mom_name || detailsUser?.email}</DialogTitle>
            <DialogDescription>{detailsUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Baby's name</span><span>{detailsUser?.baby_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Baby's age</span><span>{detailsUser?.baby_age_weeks != null ? `${detailsUser.baby_age_weeks} weeks` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Baby's birth date</span><span>{detailsUser?.baby_birth_date || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Breastfeeding status</span><span>{detailsUser?.breastfeeding_status || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pediatric clinic</span><span>{detailsUser?.pediatric_clinic || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tracking streak</span><span>{detailsUser?.tracking_streaks} days</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total drawn</span><span>{detailsUser?.total_drawn_oz} oz</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Location shared</span><span>{detailsUser?.location_consent_given ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{detailsUser ? new Date(detailsUser.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Mothers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '—' : users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '—' : activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Location Shared</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{isLoading ? '—' : locationSharedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>List of all registered mothers and their details</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
            </div>
          ) : loadError ? (
            <div className="text-center py-8 text-destructive">
              {loadError}
              <div className="pt-3">
                <Button variant="outline" onClick={loadUsers}>Retry</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{user.mom_name || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{user.location_consent_given ? 'Shared' : 'Not shared'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" disabled={pendingToggleId === user.id}>
                                  {pendingToggleId === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailsUser(user)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.is_active ? 'Deactivate' : 'Reactivate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
