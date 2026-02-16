import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/simple-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Clock, CheckCircle, Flag, Calendar } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

interface MetricCard {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  iconBgColor: string
}

function HomePage() {
  const metrics: MetricCard[] = [
    {
      title: 'Open Tickets',
      value: 23,
      description: 'Active support tickets',
      icon: <AlertCircle className="size-5" />,
      bgColor: 'bg-background',
      textColor: 'text-foreground',
      iconBgColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    },
    {
      title: 'High Priority',
      value: 5,
      description: 'Urgent items requiring attention',
      icon: <Flag className="size-5" />,
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      textColor: 'text-red-900 dark:text-red-200',
      iconBgColor: 'bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
    {
      title: 'SLA At Risk',
      value: 3,
      description: 'Tasks approaching deadline',
      icon: <Clock className="size-5" />,
      bgColor: 'bg-background',
      textColor: 'text-foreground',
      iconBgColor: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    },
    {
      title: 'Pending Approvals',
      value: 4,
      description: 'Awaiting authorization',
      icon: <CheckCircle className="size-5" />,
      bgColor: 'bg-background',
      textColor: 'text-foreground',
      iconBgColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    },
    {
      title: "Today's Appointments",
      value: 6,
      description: 'Scheduled meetings',
      icon: <Calendar className="size-5" />,
      bgColor: 'bg-background',
      textColor: 'text-foreground',
      iconBgColor: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    },
  ]

  return (
    <SimpleLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            AI Internal Automation Dashboard - Real-time metrics and status overview
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((metric, index) => (
            <Card key={index} className={`${metric.bgColor} border transition-all hover:shadow-lg`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className={`text-sm font-medium ${metric.textColor}`}>
                      {metric.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {metric.description}
                    </CardDescription>
                  </div>
                  <div className={`${metric.iconBgColor} p-2 rounded-lg flex items-center justify-center`}>
                    {metric.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${metric.textColor}`}>
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Ops Summary Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Today's Ops Summary</CardTitle>
              <CardDescription>
                Current operational status and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">•</span>
                  <span className="text-sm text-foreground">5 new maintenance tickets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">•</span>
                  <span className="text-sm text-foreground">2 refunds pending approval</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">•</span>
                  <span className="text-sm text-foreground">Unit 4B leak needs escalation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">•</span>
                  <span className="text-sm text-foreground">SLA risk on ticket #1823</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Additional content area */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Action Lists</CardTitle>
              <CardDescription>
                Manage your tickets, approvals, and urgent issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tickets" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tickets">My Tickets</TabsTrigger>
                  <TabsTrigger value="approvals">Approvals Waiting</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent Issues</TabsTrigger>
                </TabsList>

                {/* My Tickets Tab */}
                <TabsContent value="tickets" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">#1823 - Database Optimization</p>
                        <p className="text-xs text-muted-foreground">Assigned to: You</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded">In Progress</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">#1824 - API Integration Test</p>
                        <p className="text-xs text-muted-foreground">Assigned to: You</p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-1 rounded">Pending</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">#1825 - Server Maintenance</p>
                        <p className="text-xs text-muted-foreground">Assigned to: You</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded">Scheduled</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">#1826 - Security Update</p>
                        <p className="text-xs text-muted-foreground">Assigned to: You</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded">In Progress</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">#1827 - Log Analysis</p>
                        <p className="text-xs text-muted-foreground">Assigned to: You</p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-1 rounded">Pending</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Approvals Waiting Tab */}
                <TabsContent value="approvals" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">Refund Request - Order #5421</p>
                        <p className="text-xs text-muted-foreground">Waiting for: Finance Manager</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-1 rounded">Awaiting</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">Budget Approval - Q1 Spend</p>
                        <p className="text-xs text-muted-foreground">Waiting for: Director</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-1 rounded">Awaiting</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">Policy Change Request</p>
                        <p className="text-xs text-muted-foreground">Waiting for: Compliance Team</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-1 rounded">Awaiting</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium">Access Level Update</p>
                        <p className="text-xs text-muted-foreground">Waiting for: HR Manager</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-1 rounded">Awaiting</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Urgent Issues Tab */}
                <TabsContent value="urgent" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">Unit 4B - Water Leak Detected</p>
                        <p className="text-xs text-red-700 dark:text-red-400">Requires immediate escalation</p>
                      </div>
                      <span className="text-xs bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded font-semibold">CRITICAL</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">SLA Risk - Ticket #1823</p>
                        <p className="text-xs text-red-700 dark:text-red-400">Deadline: 2 hours remaining</p>
                      </div>
                      <span className="text-xs bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded font-semibold">URGENT</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">System Downtime Alert</p>
                        <p className="text-xs text-red-700 dark:text-red-400">API Gateway experiencing issues</p>
                      </div>
                      <span className="text-xs bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded font-semibold">CRITICAL</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">Security Patch Required</p>
                        <p className="text-xs text-red-700 dark:text-red-400">CVE-2024-12345 vulnerability detected</p>
                      </div>
                      <span className="text-xs bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded font-semibold">URGENT</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and events from your automation systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent activity to display. All systems operating normally.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleLayout>
  )
}
