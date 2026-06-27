'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal, MapPin, Users, Droplet, CheckCircle, AlertCircle, Plus } from 'lucide-react'

export default function FacilitiesPage() {
  const facilities = [
    {
      id: 1,
      name: 'Manila Medical Center - Milk Bank',
      city: 'Manila',
      address: '123 Medical Avenue, Manila',
      status: 'operational',
      capacity: 500,
      currentInventory: 420,
      donors: 87,
      recipients: 156,
      lastUpdate: '2024-06-10',
    },
    {
      id: 2,
      name: 'Quezon City Hospital Milk Bank',
      city: 'Quezon City',
      address: '456 Health Street, Quezon City',
      status: 'operational',
      capacity: 350,
      currentInventory: 298,
      donors: 62,
      recipients: 94,
      lastUpdate: '2024-06-09',
    },
    {
      id: 3,
      name: 'Makati Medical Milk Bank',
      city: 'Makati',
      address: '789 Care Road, Makati',
      status: 'operational',
      capacity: 400,
      currentInventory: 312,
      donors: 71,
      recipients: 128,
      lastUpdate: '2024-06-10',
    },
    {
      id: 4,
      name: 'Pasig Health Center',
      city: 'Pasig',
      address: '321 Wellness Avenue, Pasig',
      status: 'maintenance',
      capacity: 250,
      currentInventory: 145,
      donors: 35,
      recipients: 52,
      lastUpdate: '2024-06-08',
    },
    {
      id: 5,
      name: 'Caloocan Community Health',
      city: 'Caloocan',
      address: '654 Support Lane, Caloocan',
      status: 'operational',
      capacity: 300,
      currentInventory: 267,
      donors: 48,
      recipients: 71,
      lastUpdate: '2024-06-10',
    },
  ]

  const getStatusBadge = (status: string) => {
    if (status === 'operational') {
      return <Badge className="bg-chart-2 hover:bg-chart-2"><CheckCircle className="mr-1 h-3 w-3" />Operational</Badge>
    } else if (status === 'maintenance') {
      return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" />Maintenance</Badge>
    }
    return <Badge variant="destructive">Offline</Badge>
  }

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Facility Management</h1>
          <p className="text-muted-foreground mt-2">Manage milk bank facilities and monitor inventory</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Facility
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground mt-1">Metro Manila area</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">11</p>
            <p className="text-xs text-muted-foreground mt-1">All running smoothly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1.84K</p>
            <p className="text-xs text-muted-foreground mt-1">Units of milk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">903</p>
            <p className="text-xs text-muted-foreground mt-1">Donors + Recipients</p>
          </CardContent>
        </Card>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {facilities.map((facility) => {
          const capacityPercent = getCapacityPercentage(facility.currentInventory, facility.capacity)
          return (
            <Card key={facility.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {facility.address}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Facility</DropdownMenuItem>
                      <DropdownMenuItem>Manage Staff</DropdownMenuItem>
                      <DropdownMenuItem>View Reports</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {getStatusBadge(facility.status)}
                </div>

                {/* Inventory */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-chart-1" />
                      <span>Inventory Level</span>
                    </div>
                    <span className="font-medium">
                      {facility.currentInventory}/{facility.capacity} units ({capacityPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        capacityPercent > 80 ? 'bg-chart-2' :
                        capacityPercent > 50 ? 'bg-accent' :
                        'bg-destructive'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Participants */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      Donors
                    </div>
                    <p className="text-2xl font-bold">{facility.donors}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Users className="h-4 w-4 text-accent" />
                      Recipients
                    </div>
                    <p className="text-2xl font-bold">{facility.recipients}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  Last updated: {facility.lastUpdate}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
