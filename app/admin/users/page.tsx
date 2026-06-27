'use client'

import { useState } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, Mail, Phone, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const users = [
    {
      id: 1,
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+63 917 123 4567',
      type: 'Mother',
      status: 'active',
      joinDate: '2024-05-15',
      location: 'Manila',
    },
    {
      id: 2,
      name: 'Rosa Diaz',
      email: 'rosa.diaz@email.com',
      phone: '+63 918 234 5678',
      type: 'Donor',
      status: 'active',
      joinDate: '2024-04-22',
      location: 'Quezon City',
    },
    {
      id: 3,
      name: 'Ana Cruz',
      email: 'ana.cruz@email.com',
      phone: '+63 919 345 6789',
      type: 'Mother',
      status: 'pending_verification',
      joinDate: '2024-06-10',
      location: 'Makati',
    },
    {
      id: 4,
      name: 'Linda Fernandez',
      email: 'linda.fernandez@email.com',
      phone: '+63 920 456 7890',
      type: 'Donor',
      status: 'inactive',
      joinDate: '2024-03-18',
      location: 'Pasig',
    },
    {
      id: 5,
      name: 'Carmen Lopez',
      email: 'carmen.lopez@email.com',
      phone: '+63 921 567 8901',
      type: 'Mother',
      status: 'active',
      joinDate: '2024-05-28',
      location: 'Manila',
    },
  ]

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-chart-2 hover:bg-chart-2"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
      case 'pending_verification':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
      case 'inactive':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return type === 'Donor' ? (
      <Badge variant="outline" className="bg-primary/10">{type}</Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/10">{type}</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">View and manage all registered users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2,847</p>
            <p className="text-xs text-muted-foreground mt-1">+156 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Mothers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2,419</p>
            <p className="text-xs text-muted-foreground mt-1">85% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">428</p>
            <p className="text-xs text-muted-foreground mt-1">15% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">23</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>List of all registered users and their details</CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
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
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(user.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{user.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.joinDate}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit User</DropdownMenuItem>
                            <DropdownMenuItem>Send Message</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
