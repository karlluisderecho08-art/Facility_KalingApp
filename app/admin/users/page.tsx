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
import { Search, Mail, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatAmount } from '@/lib/booking'

// Read-only on purpose. This used to also show account status (Active/
// Inactive) and an Actions menu to deactivate a mother -- both removed:
// facility staff review milk bank totals here, not account standing, and
// the only thing that menu could do (deactivate/reactivate) is an
// account-level decision, not a facility-level one. The backend endpoint
// this calls (StaffUserSetActiveView) still exists and still works; this
// page just no longer calls it.
interface StaffUser {
  id: number
  email: string
  mom_name: string
  // Each a lifetime total across EVERY facility, not just this one --
  // see accounts.serializers.StaffUserListSerializer's docstring. The
  // backend never scopes these to "at this facility", so neither does
  // this page: a mother who donated at PGH and received at St. Luke's
  // shows both figures here regardless of which facility's dashboard is
  // asking.
  total_drawn_ml: number
  total_received_ml: number
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Records</h1>
        <p className="text-muted-foreground mt-2">Total milk donated and received by each registered mother</p>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Mothers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{isLoading ? '—' : users.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>List of all registered mothers and their milk bank totals</CardDescription>
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
                    <TableHead className="text-right">Donated</TableHead>
                    <TableHead className="text-right">Received</TableHead>
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
                        <TableCell className="text-right text-sm">{formatAmount(user.total_drawn_ml)}</TableCell>
                        <TableCell className="text-right text-sm">{formatAmount(user.total_received_ml)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
