import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/simple-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit2, Trash2, Power, Bell, Clock, DollarSign, FileText, Wrench } from 'lucide-react'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/automations')({
  component: AutomationsPage,
})

// ============= TYPES =============
interface Automation {
  id: string
  name: string
  category: 'maintenance' | 'rent' | 'lease' | 'scheduling' | 'vendor'
  trigger: string
  triggerDetails: string
  action: string
  actionDetails: string
  status: 'active' | 'inactive'
  createdDate: string
}

// ============= MOCK DATA =============
const mockAutomations: Automation[] = [
  {
    id: 'auto-001',
    name: 'Emergency Ticket Alert',
    category: 'maintenance',
    trigger: 'Ticket marked "Emergency"',
    triggerDetails: 'Priority = High OR Status = Emergency',
    action: 'Notify manager + auto-assign fastest technician',
    actionDetails: 'Send SMS/email to manager, assign to technician with lowest workload',
    status: 'active',
    createdDate: '2026-01-10',
  },
  {
    id: 'auto-002',
    name: 'Ticket Update Reminder',
    category: 'maintenance',
    trigger: 'Ticket not updated in 48 hours',
    triggerDetails: 'Last update > 48 hours ago AND Status not Completed',
    action: 'Send reminder email to technician',
    actionDetails: 'Automated email with ticket details and SLA status',
    status: 'active',
    createdDate: '2026-01-12',
  },
  {
    id: 'auto-003',
    name: 'Inspection Flag - Multiple Tickets',
    category: 'maintenance',
    trigger: 'Tenant submits 3+ tickets in 30 days',
    triggerDetails: 'Ticket count from same unit >= 3 in rolling 30 days',
    action: 'Flag unit for inspection',
    actionDetails: 'Create inspection task, notify manager, add to priority queue',
    status: 'active',
    createdDate: '2026-01-15',
  },
  {
    id: 'auto-004',
    name: 'Rent Due Reminder',
    category: 'rent',
    trigger: '3 days before rent due date',
    triggerDetails: 'Scheduled for 3 days before 1st of each month',
    action: 'Send SMS/email reminder to tenant',
    actionDetails: 'Automated reminder with amount due and payment methods',
    status: 'active',
    createdDate: '2026-01-08',
  },
  {
    id: 'auto-005',
    name: 'Late Payment Notice',
    category: 'rent',
    trigger: '1 day after rent due date missed',
    triggerDetails: 'Payment not received by rent due date + 1 day',
    action: 'Send late payment notice',
    actionDetails: 'Email notification of late payment with late fee details',
    status: 'active',
    createdDate: '2026-01-09',
  },
  {
    id: 'auto-006',
    name: 'Severe Late Payment Alert',
    category: 'rent',
    trigger: 'Payment 7 days late',
    triggerDetails: 'Payment outstanding > 7 days',
    action: 'Notify owner and escalate',
    actionDetails: 'Send alert to property owner, flag account for follow-up',
    status: 'active',
    createdDate: '2026-01-11',
  },
  {
    id: 'auto-007',
    name: 'Lease Renewal Offer',
    category: 'lease',
    trigger: '60 days before lease expiry',
    triggerDetails: 'Calculated automatically from lease end date',
    action: 'Send renewal offer to tenant',
    actionDetails: 'Email with renewal terms, new lease document, contact info',
    status: 'active',
    createdDate: '2026-01-13',
  },
  {
    id: 'auto-008',
    name: 'Vacancy Task Creation',
    category: 'lease',
    trigger: 'Tenant declines lease renewal',
    triggerDetails: 'Tenant clicks "Not Renewing" on renewal offer',
    action: 'Create vacancy task & schedule',
    actionDetails: 'Auto-create move-out checklist, cleaning task, inspection task',
    status: 'active',
    createdDate: '2026-01-14',
  },
  {
    id: 'auto-009',
    name: 'Tenant Onboarding',
    category: 'lease',
    trigger: 'New tenant added to property',
    triggerDetails: 'Move-in date = today OR within 3 days',
    action: 'Create onboarding checklist',
    actionDetails: 'Auto-generate welcome pack, key handoff, orientation checklist',
    status: 'active',
    createdDate: '2026-01-16',
  },
  {
    id: 'auto-010',
    name: 'Auto Schedule Suggestion',
    category: 'scheduling',
    trigger: 'New job created',
    triggerDetails: 'Any new maintenance ticket created',
    action: 'Check calendar & suggest available slots',
    actionDetails: 'Find next 3 available time slots based on technician availability',
    status: 'active',
    createdDate: '2026-01-17',
  },
  {
    id: 'auto-011',
    name: 'Appointment Confirmation Reminder',
    category: 'scheduling',
    trigger: 'Appointment not confirmed 24h before',
    triggerDetails: 'Scheduled appointment exists, no confirmation received',
    action: 'Send reminder notification',
    actionDetails: 'SMS + email reminder with appointment details',
    status: 'active',
    createdDate: '2026-01-18',
  },
  {
    id: 'auto-012',
    name: 'No-Show Tracking',
    category: 'scheduling',
    trigger: 'Appointment marked as no-show',
    triggerDetails: 'Status changed to "No Show"',
    action: 'Flag in tenant history',
    actionDetails: 'Add warning to tenant file, notify manager',
    status: 'inactive',
    createdDate: '2026-01-19',
  },
  {
    id: 'auto-013',
    name: 'Preferred Vendor Assignment',
    category: 'vendor',
    trigger: 'Job type = Plumbing',
    triggerDetails: 'Maintenance category = Plumbing',
    action: 'Auto-assign preferred vendor',
    actionDetails: 'Assign to preset preferred plumber, send job details',
    status: 'active',
    createdDate: '2026-01-20',
  },
  {
    id: 'auto-014',
    name: 'High Cost Approval Gate',
    category: 'vendor',
    trigger: 'Estimate cost > $1,000',
    triggerDetails: 'Cost estimate field > $1,000',
    action: 'Require owner approval before dispatch',
    actionDetails: 'Block job dispatch, send approval request to owner',
    status: 'active',
    createdDate: '2026-01-21',
  },
  {
    id: 'auto-015',
    name: 'Invoice Request',
    category: 'vendor',
    trigger: 'Job marked complete',
    triggerDetails: 'Status changed to "Completed"',
    action: 'Request invoice upload from vendor',
    actionDetails: 'Send automated email requesting invoice within 2 days',
    status: 'active',
    createdDate: '2026-01-22',
  },
]

// ============= CATEGORY ICONS & COLORS =============
const getCategoryIcon = (category: Automation['category']) => {
  switch (category) {
    case 'maintenance':
      return <Wrench className="w-4 h-4" />
    case 'rent':
      return <DollarSign className="w-4 h-4" />
    case 'lease':
      return <FileText className="w-4 h-4" />
    case 'scheduling':
      return <Clock className="w-4 h-4" />
    case 'vendor':
      return <Wrench className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
  }
}

const getCategoryColor = (category: Automation['category']) => {
  const colors: Record<Automation['category'], string> = {
    maintenance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    rent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    lease: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    scheduling: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    vendor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  }
  return colors[category]
}

const getCategoryLabel = (category: Automation['category']) => {
  const labels: Record<Automation['category'], string> = {
    maintenance: '🔧 Maintenance',
    rent: '💰 Rent & Payment',
    lease: '📋 Lease & Occupancy',
    scheduling: '⏰ Scheduling',
    vendor: '👷 Vendor & Contractor',
  }
  return labels[category]
}

// ============= MAIN AUTOMATIONS COMPONENT =============
function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<'all' | Automation['category']>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'maintenance' as Automation['category'],
    trigger: '',
    triggerDetails: '',
    action: '',
    actionDetails: '',
  })

  // Filtered automations
  const filteredAutomations = useMemo(() => {
    return automations.filter((auto) => {
      const categoryMatch = filterCategory === 'all' || auto.category === filterCategory
      const statusMatch = filterStatus === 'all' || auto.status === filterStatus
      return categoryMatch && statusMatch
    })
  }, [automations, filterCategory, filterStatus])

  // Stats
  const stats = useMemo(
    () => ({
      total: automations.length,
      active: automations.filter((a) => a.status === 'active').length,
      inactive: automations.filter((a) => a.status === 'inactive').length,
      byCategory: {
        maintenance: automations.filter((a) => a.category === 'maintenance').length,
        rent: automations.filter((a) => a.category === 'rent').length,
        lease: automations.filter((a) => a.category === 'lease').length,
        scheduling: automations.filter((a) => a.category === 'scheduling').length,
        vendor: automations.filter((a) => a.category === 'vendor').length,
      },
    }),
    [automations]
  )

  const handleOpenModal = () => {
    setEditingId(null)
    setFormData({
      name: '',
      category: 'maintenance',
      trigger: '',
      triggerDetails: '',
      action: '',
      actionDetails: '',
    })
    setShowModal(true)
  }

  const handleEditAutomation = (automation: Automation) => {
    setEditingId(automation.id)
    setFormData({
      name: automation.name,
      category: automation.category,
      trigger: automation.trigger,
      triggerDetails: automation.triggerDetails,
      action: automation.action,
      actionDetails: automation.actionDetails,
    })
    setShowModal(true)
  }

  const handleSaveAutomation = () => {
    if (!formData.name || !formData.trigger || !formData.action) {
      alert('Please fill in all required fields')
      return
    }

    if (editingId) {
      // Edit existing
      setAutomations(
        automations.map((auto) =>
          auto.id === editingId
            ? {
                ...auto,
                name: formData.name,
                category: formData.category,
                trigger: formData.trigger,
                triggerDetails: formData.triggerDetails,
                action: formData.action,
                actionDetails: formData.actionDetails,
              }
            : auto
        )
      )
    } else {
      // Create new
      const newAutomation: Automation = {
        id: `auto-${Date.now()}`,
        name: formData.name,
        category: formData.category,
        trigger: formData.trigger,
        triggerDetails: formData.triggerDetails,
        action: formData.action,
        actionDetails: formData.actionDetails,
        status: 'active',
        createdDate: new Date().toISOString().split('T')[0],
      }
      setAutomations([...automations, newAutomation])
    }

    setShowModal(false)
  }

  const handleToggleStatus = (id: string) => {
    setAutomations(
      automations.map((auto) =>
        auto.id === id
          ? { ...auto, status: auto.status === 'active' ? 'inactive' : 'active' }
          : auto
      )
    )
  }

  const handleDeleteAutomation = (id: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      setAutomations(automations.filter((auto) => auto.id !== id))
    }
  }

  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Automations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Rule-based workflows to eliminate manual tasks
            </p>
          </div>
          <Button onClick={handleOpenModal} className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>New Automation</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800">
            <CardContent className="p-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Active</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.active}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
            <CardContent className="p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Maintenance</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.byCategory.maintenance}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800">
            <CardContent className="p-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Rent</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.byCategory.rent}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800">
            <CardContent className="p-3">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Lease</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.byCategory.lease}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="rent">💰 Rent & Payment</option>
                  <option value="lease">📋 Lease & Occupancy</option>
                  <option value="scheduling">⏰ Scheduling</option>
                  <option value="vendor">👷 Vendor & Contractor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Results</label>
                <div className="h-8 px-2.5 rounded-md border border-input bg-background text-xs flex items-center">
                  Showing {filteredAutomations.length} of {automations.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Category</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Trigger</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAutomations.length > 0 ? (
                    filteredAutomations.map((automation) => (
                      <tr key={automation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{automation.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 w-fit ${getCategoryColor(automation.category)}`}>
                            {getCategoryIcon(automation.category)}
                            {getCategoryLabel(automation.category)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-gray-700 dark:text-gray-300">{automation.trigger}</td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-gray-700 dark:text-gray-300">{automation.action}</td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => handleToggleStatus(automation.id)}
                            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 w-fit ${
                              automation.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {automation.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAutomation(automation)}
                              className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded text-blue-600 dark:text-blue-400"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAutomation(automation.id)}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded text-red-600 dark:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No automations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Automation Categories Info */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              icon: '🔧',
              title: 'Maintenance',
              count: stats.byCategory.maintenance,
              examples: ['Emergency alerts', 'Ticket reminders', 'Inspection flags'],
            },
            {
              icon: '💰',
              title: 'Rent & Payment',
              count: stats.byCategory.rent,
              examples: ['Rent reminders', 'Late notices', 'Owner alerts'],
            },
            {
              icon: '📋',
              title: 'Lease & Occupancy',
              count: stats.byCategory.lease,
              examples: ['Renewal offers', 'Vacancy tasks', 'Onboarding'],
            },
            {
              icon: '⏰',
              title: 'Scheduling',
              count: stats.byCategory.scheduling,
              examples: ['Time slots', 'Confirmations', 'No-show tracking'],
            },
            {
              icon: '👷',
              title: 'Vendor & Contractor',
              count: stats.byCategory.vendor,
              examples: ['Vendor assignment', 'Cost gates', 'Invoice requests'],
            },
          ].map((category) => (
            <Card key={category.title} className="bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-3xl mb-2">{category.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{category.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{category.count} active</p>
                <ul className="space-y-1">
                  {category.examples.map((example, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create/Edit Automation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? 'Edit Automation' : 'Create New Automation'}</CardTitle>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Automation Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Ticket Alert"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Automation['category'] })}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="rent">💰 Rent & Payment</option>
                  <option value="lease">📋 Lease & Occupancy</option>
                  <option value="scheduling">⏰ Scheduling</option>
                  <option value="vendor">👷 Vendor & Contractor</option>
                </select>
              </div>

              {/* Trigger */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Trigger *</label>
                  <input
                    type="text"
                    value={formData.trigger}
                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                    placeholder="e.g., Ticket marked Emergency"
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Trigger Details</label>
                  <input
                    type="text"
                    value={formData.triggerDetails}
                    onChange={(e) => setFormData({ ...formData, triggerDetails: e.target.value })}
                    placeholder="e.g., Priority = High"
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Action *</label>
                  <input
                    type="text"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    placeholder="e.g., Notify manager & auto-assign"
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Action Details</label>
                  <input
                    type="text"
                    value={formData.actionDetails}
                    onChange={(e) => setFormData({ ...formData, actionDetails: e.target.value })}
                    placeholder="e.g., Send SMS to manager"
                    className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button size="sm" onClick={handleSaveAutomation} className="flex-1">
                  {editingId ? 'Update' : 'Create'} Automation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SimpleLayout>
  )
}
