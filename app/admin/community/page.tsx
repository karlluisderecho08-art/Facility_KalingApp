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
import { MoreHorizontal, Flag, AlertTriangle, CheckCircle, Trash2, MessageCircle } from 'lucide-react'

export default function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'flagged' | 'approved'>('all')

  const posts = [
    {
      id: 1,
      author: 'Maria Santos',
      avatar: '👩',
      title: 'Tips for increasing milk supply',
      content: 'I found that drinking more water and frequent pumping has really helped my milk production...',
      category: 'Advice',
      status: 'approved',
      likes: 124,
      comments: 34,
      flagCount: 0,
      createdAt: '2024-06-10',
    },
    {
      id: 2,
      author: 'Rosa Diaz',
      avatar: '👩‍🦱',
      title: 'Question about formula vs breastmilk',
      content: 'I&apos;m struggling with exclusive breastfeeding. Has anyone here successfully transitioned...',
      category: 'Question',
      status: 'approved',
      likes: 89,
      comments: 56,
      flagCount: 0,
      createdAt: '2024-06-10',
    },
    {
      id: 3,
      author: 'John Doe',
      avatar: '👨',
      title: 'Buy this miracle supplement for milk!',
      content: 'Click here for guaranteed milk increase! Limited time offer! [SPAM LINK]',
      category: 'Other',
      status: 'flagged',
      likes: 2,
      comments: 5,
      flagCount: 12,
      createdAt: '2024-06-10',
    },
    {
      id: 4,
      author: 'Ana Cruz',
      avatar: '👩‍⚕️',
      title: 'Dealing with postpartum depression while breastfeeding',
      content: 'It&apos;s been challenging but important to seek help. Here are resources that helped me...',
      category: 'Support',
      status: 'approved',
      likes: 267,
      comments: 72,
      flagCount: 0,
      createdAt: '2024-06-09',
    },
    {
      id: 5,
      author: 'Unknown User',
      avatar: '❓',
      title: 'Inappropriate content post',
      content: '[Content removed due to community guidelines violation]',
      category: 'Other',
      status: 'flagged',
      likes: 0,
      comments: 0,
      flagCount: 28,
      createdAt: '2024-06-09',
    },
  ]

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-chart-2 hover:bg-chart-2"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
    }
    return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Flagged</Badge>
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'Advice': 'bg-primary/10',
      'Question': 'bg-accent/10',
      'Support': 'bg-chart-2/10',
      'Other': 'bg-muted',
    }
    return <Badge variant="outline" className={colors[category] || 'bg-muted'}>{category}</Badge>
  }

  const filteredPosts = posts.filter((post) => {
    if (selectedTab === 'flagged') return post.status === 'flagged'
    if (selectedTab === 'approved') return post.status === 'approved'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Community Moderation</h1>
        <p className="text-muted-foreground mt-2">Review and moderate community posts and comments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1,847</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">23</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">5,234</p>
            <p className="text-xs text-muted-foreground mt-1">Community engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Removed Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">127</p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {['all', 'flagged', 'approved'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{post.avatar}</div>
                      <div>
                        <p className="font-medium">{post.author}</p>
                        <p className="text-xs text-muted-foreground">{post.createdAt}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Full Post</DropdownMenuItem>
                      <DropdownMenuItem>View Author Profile</DropdownMenuItem>
                      {post.status === 'flagged' && (
                        <>
                          <DropdownMenuItem className="text-chart-2">Approve Post</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remove Post</DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem className="text-destructive">Ban User</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Title and Content */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-3">{post.content}</p>
                </div>

                {/* Category and Status */}
                <div className="flex flex-wrap items-center gap-2">
                  {getCategoryBadge(post.category)}
                  {getStatusBadge(post.status)}
                  {post.flagCount > 0 && (
                    <Badge variant="destructive" className="bg-destructive/20 text-destructive">
                      <Flag className="mr-1 h-3 w-3" />
                      {post.flagCount} flags
                    </Badge>
                  )}
                </div>

                {/* Engagement Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {post.likes} likes
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments} comments
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
