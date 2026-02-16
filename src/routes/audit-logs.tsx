import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/simple-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Download,
  ChevronRight,
  AlertTriangle,
  Eye,
  Clock,
  User,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/audit-logs')({
  component: AuditLogsPage,
})

// ============= TYPES =============
interface AuditLog {
  id: string
  timestamp: string
  actor: {
    name: string
    role: string
  }
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'exported' | 'login' | 'viewed'
  entity: 'ticket' | 'payment' | 'lease' | 'property' | 'tenant' | 'automation' | 'user'
  entityId: string
  entityName: string
  before?: Record<string, any>
  after?: Record<string, any>
  source: 'web' | 'mobile' | 'api' | 'n8n' | 'ai_agent'
  ipAddress: string
  device: string
  correlationId: string
  reason?: string
  riskLevel: 'low' | 'medium' | 'high'
}

// ============= MOCK DATA =============
const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-02-12 14:35:22',
    actor: { name: 'John Manager', role: 'Property Manager' },
    action: 'approved',
    entity: 'ticket',
    entityId: '#1823',
    entityName: 'AC Repair - Unit 4A',
    before: { status: 'pending', assignee: 'unassigned' },
    after: { status: 'approved', assignee: 'Mike Johnson' },
    source: 'web',
    ipAddress: '192.168.1.100',
    device: 'Chrome / macOS',
    correlationId: 'corr-2026-02-12-001',
    reason: 'Emergency repair approved - tenant complaint',
    riskLevel: 'low',
  },
  {
    id: 'log-002',
    timestamp: '2026-02-12 14:28:15',
    actor: { name: 'AI Agent', role: 'System' },
    action: 'created',
    entity: 'automation',
    entityId: 'auto-1823',
    entityName: 'Emergency Ticket Alert',
    source: 'ai_agent',
    ipAddress: 'N/A',
    device: 'N/A',
    correlationId: 'corr-2026-02-12-002',
    riskLevel: 'low',
  },
  {
    id: 'log-003',
    timestamp: '2026-02-12 13:45:08',
    actor: { name: 'Admin User', role: 'Administrator' },
    action: 'updated',
    entity: 'payment',
    entityId: 'pay-5421',
    entityName: 'Unit 4B Rent Payment',
    before: { status: 'pending', amount: 2200 },
    after: { status: 'received', amount: 2200, receivedDate: '2026-02-12' },
    source: 'web',
    ipAddress: '192.168.1.50',
    device: 'Safari / macOS',
    correlationId: 'corr-2026-02-12-003',
    riskLevel: 'low',
  },
  {
    id: 'log-004',
    timestamp: '2026-02-12 12:15:32',
    actor: { name: 'Automation System', role: 'System' },
    action: 'created',
    entity: 'ticket',
    entityId: '#1840',
    entityName: 'Inspection Flag - Unit 3C',
    source: 'n8n',
    ipAddress: 'N/A',
    device: 'N/A',
    correlationId: 'corr-2026-02-12-004',
    riskLevel: 'medium',
  },
  {
    id: 'log-005',
    timestamp: '2026-02-12 11:22:45',
    actor: { name: 'Sarah Admin', role: 'Administrator' },
    action: 'updated',
    entity: 'lease',
    entityId: 'lease-3891',
    entityName: 'Unit 4B - 12 Month Lease',
    before: { endDate: '2026-06-30', status: 'active' },
    after: { endDate: '2026-06-30', status: 'renewal_pending' },
    source: 'web',
    ipAddress: '192.168.1.75',
    device: 'Firefox / Windows',
    correlationId: 'corr-2026-02-12-005',
    reason: 'Manual renewal trigger',
    riskLevel: 'low',
  },
  {
    id: 'log-006',
    timestamp: '2026-02-12 10:50:18',
    actor: { name: 'Owner User', role: 'Property Owner' },
    action: 'exported',
    entity: 'payment',
    entityId: 'report-2026-02',
    entityName: 'February 2026 Payment Report',
    source: 'web',
    ipAddress: '203.45.67.89',
    device: 'Mobile Safari / iOS',
    correlationId: 'corr-2026-02-12-006',
    riskLevel: 'medium',
  },
  {
    id: 'log-007',
    timestamp: '2026-02-12 09:33:22',
    actor: { name: 'System', role: 'System' },
    action: 'login',
    entity: 'user',
    entityId: 'user-john-manager',
    entityName: 'John Manager',
    source: 'web',
    ipAddress: '192.168.1.100',
    device: 'Chrome / macOS',
    correlationId: 'corr-2026-02-12-007',
    riskLevel: 'low',
  },
  {
    id: 'log-008',
    timestamp: '2026-02-11 16:45:30',
    actor: { name: 'Admin User', role: 'Administrator' },
    action: 'deleted',
    entity: 'automation',
    entityId: 'auto-1201',
    entityName: 'Old No-Show Rule',
    before: { name: 'Old No-Show Rule', status: 'inactive' },
    source: 'web',
    ipAddress: '192.168.1.50',
    device: 'Safari / macOS',
    correlationId: 'corr-2026-02-11-001',
    reason: 'Rule replaced with new version',
    riskLevel: 'medium',
  },
  {
    id: 'log-009',
    timestamp: '2026-02-11 14:22:15',
    actor: { name: 'API Service', role: 'System' },
    action: 'updated',
    entity: 'tenant',
    entityId: 'tenant-3829',
    entityName: 'Robert Wilson - Unit 4B',
    before: { paymentStatus: 'current', latePayments: 0 },
    after: { paymentStatus: 'late', latePayments: 1, overdueAmount: 450 },
    source: 'api',
    ipAddress: '10.0.0.1',
    device: 'N/A',
    correlationId: 'corr-2026-02-11-002',
    riskLevel: 'high',
  },
  {
    id: 'log-010',
    timestamp: '2026-02-11 11:08:45',
    actor: { name: 'Property Manager', role: 'Property Manager' },
    action: 'viewed',
    entity: 'payment',
    entityId: 'pay-5421',
    entityName: 'Unit 4B Rent Payment',
    source: 'web',
    ipAddress: '192.168.1.100',
    device: 'Chrome / macOS',
    correlationId: 'corr-2026-02-11-003',
    riskLevel: 'low',
  },
  {
    id: 'log-011',
    timestamp: '2026-02-10 17:30:22',
    actor: { name: 'Admin User', role: 'Administrator' },
    action: 'updated',
    entity: 'user',
    entityId: 'user-jane-smith',
    entityName: 'Jane Smith',
    before: { role: 'technician', permissions: ['view_tickets'] },
    after: { role: 'team_lead', permissions: ['view_tickets', 'assign_tickets', 'approve_work'] },
    source: 'web',
    ipAddress: '192.168.1.50',
    device: 'Safari / macOS',
    correlationId: 'corr-2026-02-10-001',
    reason: 'Promotion to team lead',
    riskLevel: 'high',
  },
  {
    id: 'log-012',
    timestamp: '2026-02-10 15:12:08',
    actor: { name: 'Automation System', role: 'System' },
    action: 'created',
    entity: 'ticket',
    entityId: '#1835',
    entityName: 'Rent Reminder - Unit 1A',
    source: 'n8n',
    ipAddress: 'N/A',
    device: 'N/A',
    correlationId: 'corr-2026-02-10-002',
    riskLevel: 'low',
  },
]

// ============= HELPER FUNCTIONS =============
const getActionColor = (action: AuditLog['action']) => {
  const colors: Record<AuditLog['action'], string> = {
    created: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    exported: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    login: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    viewed: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[action]
}

const getEntityIcon = (entity: AuditLog['entity']) => {
  const icons: Record<AuditLog['entity'], string> = {
    ticket: '🎫',
    payment: '💰',
    lease: '📋',
    property: '🏢',
    tenant: '👤',
    automation: '🤖',
    user: '👥',
  }
  return icons[entity]
}

const getSourceColor = (source: AuditLog['source']) => {
  const colors: Record<AuditLog['source'], string> = {
    web: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    mobile: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    api: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    n8n: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    ai_agent: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  }
  return colors[source]
}

const getRiskBadgeColor = (riskLevel: AuditLog['riskLevel']) => {
  const colors: Record<AuditLog['riskLevel'], string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  return colors[riskLevel]
}

const getRiskIcon = (riskLevel: AuditLog['riskLevel']) => {
  switch (riskLevel) {
    case 'high':
      return <AlertTriangle className="w-4 h-4" />
    default:
      return null
  }
}

// ============= MAIN AUDIT LOGS COMPONENT =============
function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filters
  const [filterDateRange, setFilterDateRange] = useState('30')
  const [filterActor, setFilterActor] = useState('all')
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterRiskLevel, setFilterRiskLevel] = useState('all')
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false)

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const actorMatch = filterActor === 'all' || log.actor.name === filterActor
      const entityMatch = filterEntity === 'all' || log.entity === filterEntity
      const actionMatch = filterAction === 'all' || log.action === filterAction
      const sourceMatch = filterSource === 'all' || log.source === filterSource
      const riskMatch = filterRiskLevel === 'all' || log.riskLevel === filterRiskLevel
      const highRiskMatch = !showHighRiskOnly || log.riskLevel === 'high'

      return actorMatch && entityMatch && actionMatch && sourceMatch && riskMatch && highRiskMatch
    })
  }, [logs, filterActor, filterEntity, filterAction, filterSource, filterRiskLevel, showHighRiskOnly])

  // Stats
  const stats = useMemo(
    () => ({
      total: logs.length,
      today: logs.filter((l) => l.timestamp.startsWith('2026-02-12')).length,
      highRisk: logs.filter((l) => l.riskLevel === 'high').length,
      deletions: logs.filter((l) => l.action === 'deleted').length,
    }),
    [logs]
  )

  const uniqueActors = useMemo(() => [...new Set(logs.map((l) => l.actor.name))], [logs])

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetailDrawer(true)
  }

  const toggleRowExpand = (logId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  const downloadLogs = (format: 'csv' | 'json') => {
    const timestamp = new Date().toISOString().split('T')[0]
    alert(`📥 ${filteredLogs.length} logs exported as ${format.toUpperCase()} - ${timestamp}`)
  }

  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Complete activity tracking and compliance logging
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadLogs('csv')}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadLogs('json')}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Logs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.today} today</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">High Risk Events</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.highRisk}</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800">
            <CardContent className="p-4">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">Deletions</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.deletions}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Retention</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">90 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Main filters row */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="1">Last 24 hours</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Actor</label>
                  <select
                    value={filterActor}
                    onChange={(e) => setFilterActor(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="all">All Users</option>
                    {uniqueActors.map((actor) => (
                      <option key={actor} value={actor}>
                        {actor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Entity</label>
                  <select
                    value={filterEntity}
                    onChange={(e) => setFilterEntity(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="all">All Entities</option>
                    <option value="ticket">🎫 Ticket</option>
                    <option value="payment">💰 Payment</option>
                    <option value="lease">📋 Lease</option>
                    <option value="property">🏢 Property</option>
                    <option value="tenant">👤 Tenant</option>
                    <option value="automation">🤖 Automation</option>
                    <option value="user">👥 User</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Action</label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="all">All Actions</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="deleted">Deleted</option>
                    <option value="approved">Approved</option>
                    <option value="exported">Exported</option>
                    <option value="login">Login</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="all">All Sources</option>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                    <option value="api">API</option>
                    <option value="n8n">n8n</option>
                    <option value="ai_agent">AI Agent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Risk Level</label>
                  <select
                    value={filterRiskLevel}
                    onChange={(e) => setFilterRiskLevel(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* High-risk filter toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="high-risk-only"
                  checked={showHighRiskOnly}
                  onChange={(e) => setShowHighRiskOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="high-risk-only" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Show High-Risk Events Only
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High-Risk Events Section */}
        {stats.highRisk > 0 && (
          <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                High-Risk Events ({stats.highRisk})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs
                .filter((log) => log.riskLevel === 'high')
                .slice(0, 5)
                .map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-2 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900">
                        {log.actor.name} {log.action}d {getEntityIcon(log.entity)} {log.entityName}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{log.timestamp}</p>
                    </div>
                    <button
                      onClick={() => handleRowClick(log)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity Feed ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border font-semibold text-xs">
                <div className="w-8"></div>
                <div className="col-span-1">Time</div>
                <div className="col-span-1">Actor</div>
                <div className="col-span-1">Action</div>
                <div className="col-span-1">Entity</div>
                <div className="col-span-1">Source</div>
                <div className="col-span-1">Risk</div>
                <div className="col-span-1">Corr ID</div>
              </div>

              {/* Log Rows */}
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div key={log.id}>
                    {/* Log Row Card */}
                    <div
                      onClick={() => handleRowClick(log)}
                      className="grid grid-cols-8 gap-3 px-4 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition items-start"
                    >
                      {/* Expand Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRowExpand(log.id)
                        }}
                        className="text-gray-400 hover:text-gray-600 pt-1"
                      >
                        {expandedRows.has(log.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Time */}
                      <div className="text-xs">
                        <p className="font-mono text-gray-900">{log.timestamp}</p>
                      </div>

                      {/* Actor */}
                      <div className="text-xs">
                        <p className="text-gray-900 font-medium">{log.actor.name}</p>
                        <p className="text-gray-500">{log.actor.role}</p>
                      </div>

                      {/* Action */}
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded text-xs font-semibold inline-block ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>

                      {/* Entity */}
                      <div className="text-xs">
                        <div className="flex items-start gap-1">
                          <span className="text-lg leading-none">{getEntityIcon(log.entity)}</span>
                          <div>
                            <p className="text-gray-900 font-medium">{log.entityName}</p>
                            <p className="text-gray-500">{log.entityId}</p>
                          </div>
                        </div>
                      </div>

                      {/* Source */}
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded text-xs font-semibold inline-block ${getSourceColor(log.source)}`}>
                          {log.source === 'ai_agent' ? 'AI' : log.source}
                        </span>
                      </div>

                      {/* Risk */}
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${getRiskBadgeColor(log.riskLevel)}`}>
                          {getRiskIcon(log.riskLevel)}
                          {log.riskLevel}
                        </span>
                      </div>

                      {/* Correlation ID */}
                      <div className="text-xs">
                        <p className="font-mono text-gray-900">{log.correlationId}</p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedRows.has(log.id) && (
                      <div className="ml-4 mt-2 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="space-y-3">
                          {/* Before/After */}
                          {log.before && log.after && (
                            <div>
                              <p className="text-xs font-semibold text-gray-900 mb-2">Changes</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-700 font-semibold mb-1">Before</p>
                                  <pre className="bg-white dark:bg-gray-900 p-2 rounded border text-xs overflow-auto max-h-20">
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-700 font-semibold mb-1">After</p>
                                  <pre className="bg-white dark:bg-gray-900 p-2 rounded border text-xs overflow-auto max-h-20">
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reason */}
                          {log.reason && (
                            <div>
                              <p className="text-xs font-semibold text-gray-900 mb-1">Reason</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded border">{log.reason}</p>
                            </div>
                          )}

                          {/* Technical Details */}
                          <div>
                            <p className="text-xs font-semibold text-gray-900 mb-2">Technical Details</p>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                                <p className="text-gray-600 font-semibold">IP Address</p>
                                <p className="font-mono text-gray-900">{log.ipAddress}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                                <p className="text-gray-600 font-semibold">Device</p>
                                <p className="text-gray-900">{log.device}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                                <p className="text-gray-600 font-semibold">Source</p>
                                <p className="text-gray-900 capitalize">{log.source}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No logs found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Footer */}
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Audit Log Policy</p>
                <p className="text-xs text-blue-800 mt-1">
                  Logs are retained for 90 days by default. For extended retention (1-3 years) or compliance requirements, contact your administrator.
                  All high-risk events (permission changes, deletions, payments) are flagged for compliance review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      {showDetailDrawer && selectedLog && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-900 border-l shadow-lg overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Event Details</h2>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Summary</p>
                <p className="text-sm text-gray-900">
                  {selectedLog.actor.name} {selectedLog.action}d {getEntityIcon(selectedLog.entity)} {selectedLog.entityName}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Metadata</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timestamp:</span>
                    <span className="font-mono text-gray-900">{selectedLog.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actor:</span>
                    <span className="text-gray-900">{selectedLog.actor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="text-gray-900">{selectedLog.actor.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entity ID:</span>
                    <span className="font-mono text-gray-900">{selectedLog.entityId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP Address:</span>
                    <span className="font-mono text-gray-900">{selectedLog.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Device:</span>
                    <span className="text-gray-900">{selectedLog.device}</span>
                  </div>
                </div>
              </div>

              {/* Before/After */}
              {selectedLog.before && selectedLog.after && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Changes</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Before</p>
                      <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-24 border">
                        {JSON.stringify(selectedLog.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">After</p>
                      <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-24 border">
                        {JSON.stringify(selectedLog.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              {selectedLog.reason && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Reason / Note</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded border">{selectedLog.reason}</p>
                </div>
              )}

              {/* Correlation */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Correlation ID</p>
                <p className="text-xs font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded border">{selectedLog.correlationId}</p>
                <p className="text-xs text-gray-600">
                  This ID links related events in a chain of actions.
                </p>
              </div>

              {/* Risk Level */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Risk Assessment</p>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskBadgeColor(selectedLog.riskLevel)}`}>
                  {selectedLog.riskLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SimpleLayout>
  )
}
