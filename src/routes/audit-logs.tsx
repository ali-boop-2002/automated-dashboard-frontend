import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/simple-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Download,
  ChevronRight,
  AlertTriangle,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { requireAuth } from '@/lib/auth-guard'
import { authFetch, API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/audit-logs')({
  beforeLoad: requireAuth,
  component: AuditLogsPage,
})

// API entity_type: ticket | approval | document | property | unit | rent_payment
// API action: created | updated | deleted
// API source: api | ai | system | web
// API risk_level: low | medium | high

// ============= TYPES =============
interface AuditLog {
  id: string
  timestamp: string
  actor: {
    name?: string
    email?: string
    role?: string
  }
  action: string
  entity: string
  entityId: string
  entityName: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  source: string
  ipAddress?: string
  device?: string
  correlationId?: string
  reason?: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface AuditStats {
  total?: number
  today?: number
  high_risk?: number
  deletions?: number
  retention_days?: number
}

// Normalize API log to AuditLog shape
function normalizeLog(raw: Record<string, unknown>): AuditLog {
  const actorEmail = raw.actor_email != null ? String(raw.actor_email) : (raw.actor as Record<string, string>)?.email ?? (typeof raw.actor === 'string' ? raw.actor : '')
  const actor = raw.actor as Record<string, string> | undefined
  const actorObj = {
    name: actorEmail || actor?.name,
    email: actorEmail || actor?.email,
    role: actor?.role,
  }

  return {
    id: String(raw.id ?? raw.correlation_id ?? Math.random()),
    timestamp:
      String(raw.timestamp ?? raw.created_at ?? '') ||
      new Date().toISOString(),
    actor: actorObj,
    action: String(raw.action ?? ''),
    entity: String(raw.entity_type ?? raw.entity ?? ''),
    entityId: String(raw.entity_id ?? raw.entityId ?? ''),
    entityName: String(raw.entity_name ?? raw.entityName ?? ''),
    before: (raw.before as Record<string, unknown>) ?? undefined,
    after: (raw.after as Record<string, unknown>) ?? undefined,
    source: String(raw.source ?? ''),
    ipAddress: raw.ip_address != null ? String(raw.ip_address) : raw.ipAddress != null ? String(raw.ipAddress) : 'N/A',
    device: raw.device != null ? String(raw.device) : 'N/A',
    correlationId: raw.correlation_id != null ? String(raw.correlation_id) : raw.correlationId != null ? String(raw.correlationId) : '',
    reason: raw.reason != null ? String(raw.reason) : undefined,
    riskLevel: ((raw.risk_level ?? raw.riskLevel) as 'low' | 'medium' | 'high') || 'low',
  }
}

// ============= HELPER FUNCTIONS =============
const truncateActor = (s: string, max = 15) =>
  s.length > max ? `${s.slice(0, max)}...` : s

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    created: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    exported: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    login: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    viewed: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[action] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

const getEntityIcon = (entity: string) => {
  const icons: Record<string, string> = {
    ticket: '🎫',
    approval: '✅',
    document: '📄',
    property: '🏢',
    unit: '🚪',
    rent_payment: '💰',
    payment: '💰',
    lease: '📋',
    tenant: '👤',
    automation: '🤖',
    user: '👥',
  }
  return icons[entity] ?? '📌'
}

const getSourceColor = (source: string) => {
  const colors: Record<string, string> = {
    web: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    api: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    ai: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
    system: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    mobile: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    n8n: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    ai_agent: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  }
  return colors[source] ?? 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
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

// Build ISO date range from filter (e.g. "30" -> last 30 days)
function getDateRangeFromFilter(days: string): { start_date: string; end_date: string } {
  const d = parseInt(days, 10) || 30
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - d)
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  }
}

// ============= MAIN AUDIT LOGS COMPONENT =============
function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats>({})
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
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

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const { start_date, end_date } = getDateRangeFromFilter(filterDateRange)
      const params = new URLSearchParams()
      params.set('start_date', start_date)
      params.set('end_date', end_date)
      if (filterActor !== 'all') params.set('actor', filterActor)
      if (filterEntity !== 'all') params.set('entity_type', filterEntity)
      if (filterAction !== 'all') params.set('action', filterAction)
      if (filterSource !== 'all') params.set('source', filterSource)
      if (filterRiskLevel !== 'all') params.set('risk_level', filterRiskLevel)
      if (showHighRiskOnly) params.set('high_risk_only', 'true')
      params.set('limit', '100')
      params.set('offset', '0')

      const res = await authFetch(`${API_BASE_URL}/audit-logs?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to fetch audit logs')
      }
      const data = await res.json()
      const items = Array.isArray(data) ? data : data.logs ?? data.items ?? []
      setLogs(items.map((item: Record<string, unknown>) => normalizeLog(item)))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load audit logs'
      toast.error(msg)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [
    filterDateRange,
    filterActor,
    filterEntity,
    filterAction,
    filterSource,
    filterRiskLevel,
    showHighRiskOnly,
  ])

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const res = await authFetch(`${API_BASE_URL}/audit-logs/stats`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Failed to fetch stats')
      }
      const data = await res.json()
      setStats({
        total: data.total ?? data.total_logs ?? 0,
        today: data.today ?? data.today_count ?? 0,
        high_risk: data.high_risk ?? data.high_risk_count ?? 0,
        deletions: data.deletions ?? data.deletion_count ?? 0,
        retention_days: data.retention_days ?? 90,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load stats'
      toast.error(msg)
      setStats({})
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const filteredLogs = logs

  const uniqueActors = useMemo(
    () => [...new Set(logs.map((l) => l.actor.email ?? l.actor.name).filter(Boolean))],
    [logs]
  )

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
    toast.info(`${filteredLogs.length} logs exported as ${format.toUpperCase()} - ${timestamp}`)
  }

  const displayStats = {
    total: stats.total ?? 0,
    today: stats.today ?? 0,
    highRisk: stats.high_risk ?? 0,
    deletions: stats.deletions ?? 0,
    retentionDays: stats.retention_days ?? 90,
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
              <p className="text-xs text-muted-foreground mb-1">Total Logs</p>
              {loadingStats ? (
                <Loader className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{displayStats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">{displayStats.today} today</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">High Risk Events</p>
              {loadingStats ? (
                <Loader className="size-6 animate-spin text-red-600" />
              ) : (
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{displayStats.highRisk}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800">
            <CardContent className="p-4">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">Deletions</p>
              {loadingStats ? (
                <Loader className="size-6 animate-spin text-orange-600" />
              ) : (
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{displayStats.deletions}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Retention</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{displayStats.retentionDays} days</p>
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
                    <option value="ticket">Ticket</option>
                    <option value="approval">Approval</option>
                    <option value="document">Document</option>
                    <option value="property">Property</option>
                    <option value="unit">Unit</option>
                    <option value="rent_payment">Rent Payment</option>
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
                    <option value="api">API</option>
                    <option value="ai">AI</option>
                    <option value="system">System</option>
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
        {displayStats.highRisk > 0 && (
          <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                High-Risk Events ({displayStats.highRisk})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs
                .filter((log) => log.riskLevel === 'high')
                .slice(0, 5)
                .map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-2 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {truncateActor(log.actor.name ?? log.actor.email ?? 'Unknown')} {log.action}d {getEntityIcon(log.entity)} {log.entityName}
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
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
                      <div className="text-xs min-w-0">
                        <p className="text-gray-900 dark:text-gray-100 font-medium" title={log.actor.name ?? log.actor.email ?? '—'}>
                          {truncateActor(log.actor.name ?? log.actor.email ?? '—')}
                        </p>
                        <p className="text-gray-500">{log.actor.role ?? '—'}</p>
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
                          {log.source === 'ai_agent' || log.source === 'ai' ? 'AI' : log.source}
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
                        <p className="font-mono text-gray-900 dark:text-gray-100">{log.correlationId || '—'}</p>
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
            )}
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
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {truncateActor(selectedLog.actor.name ?? selectedLog.actor.email ?? 'Unknown', 15)} {selectedLog.action}d {getEntityIcon(selectedLog.entity)} {selectedLog.entityName}
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
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 shrink-0">Actor:</span>
                    <span className="text-gray-900 dark:text-gray-100 truncate text-right" title={selectedLog.actor.name ?? selectedLog.actor.email ?? '—'}>
                      {truncateActor(selectedLog.actor.name ?? selectedLog.actor.email ?? '—', 15)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedLog.actor.role ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entity ID:</span>
                    <span className="font-mono text-gray-900">{selectedLog.entityId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP Address:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100">{selectedLog.ipAddress ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Device:</span>
                    <span className="text-gray-900 dark:text-gray-100">{selectedLog.device ?? '—'}</span>
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
                <p className="text-xs font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded border">{selectedLog.correlationId ?? '—'}</p>
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
