'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/button'
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
import { Search, MoreHorizontal, CheckCircle, Clock, XCircle, Plus } from 'lucide-react'

export default function ArticlesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const articles = [
    {
      id: 1,
      title: 'Proper Latching Techniques for Newborns',
      author: 'Dr. Juan Dela Cruz',
      category: 'Breastfeeding Basics',
      status: 'approved',
      views: 2450,
      comments: 34,
      publishDate: '2024-06-01',
    },
    {
      id: 2,
      title: 'Managing Engorgement Naturally',
      author: 'Dr. Maria Santos',
      category: 'Common Concerns',
      status: 'approved',
      views: 1890,
      comments: 28,
      publishDate: '2024-05-28',
    },
    {
      id: 3,
      title: 'Benefits of Expressing Breast Milk',
      author: 'Dr. Rosa Reyes',
      category: 'Milk Expression',
      status: 'pending_review',
      views: 0,
      comments: 0,
      publishDate: null,
    },
    {
      id: 4,
      title: 'Nutrition Tips for Breastfeeding Mothers',
      author: 'Dr. Ana Cruz',
      category: 'Maternal Health',
      status: 'pending_review',
      views: 0,
      comments: 0,
      publishDate: null,
    },
    {
      id: 5,
      title: 'Returning to Work While Breastfeeding',
      author: 'Dr. Linda Fernandez',
      category: 'Lifestyle',
      status: 'rejected',
      views: 0,
      comments: 0,
      publishDate: null,
    },
  ]

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.author.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-chart-2 hover:bg-chart-2"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
      case 'pending_review':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Article Management</h1>
          <p className="text-muted-foreground mt-2">Review and manage verified knowledge content</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Article
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">156</p>
            <p className="text-xs text-muted-foreground mt-1">Published content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">8</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">89.3K</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2,847</p>
            <p className="text-xs text-muted-foreground mt-1">Community engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Articles</CardTitle>
              <CardDescription>All published and pending articles</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                className="pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm w-full"
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
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length > 0 ? (
                  filteredArticles.map((article) => (
                    <TableRow key={article.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-xs truncate">{article.title}</TableCell>
                      <TableCell className="text-sm">{article.author}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/10">{article.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(article.status)}</TableCell>
                      <TableCell className="text-sm">{article.views.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{article.comments}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {article.publishDate || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Article</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            {article.status === 'pending_review' && (
                              <>
                                <DropdownMenuItem className="text-chart-2">Approve</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No articles found
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
