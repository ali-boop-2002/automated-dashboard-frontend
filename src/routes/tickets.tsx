import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { env } from "@/env";

import { requireAuth } from '@/lib/auth-guard'
import { authFetch } from '@/lib/api'

export const Route = createFileRoute("/tickets")({
  beforeLoad: requireAuth,
  component: TicketsPage,
});

interface Ticket {
  id: string | number;
  property: string;
  property_id?: number;
  type: string;
  issue: string;
  priority: string;
  assigned_to?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  sla_due_at?: string;
  maintenance_category?: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  total_units: number;
  manager_name?: string;
  status?: string;
}

const API_BASE_URL = env.VITE_API_BASE_URL;

function TicketsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showEditTicketModal, setShowEditTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editTicketForm, setEditTicketForm] = useState({
    property_id: "",
    type: "maintenance",
    issue: "",
    priority: "medium",
    assigned_to: "",
    status: "open",
    sla_due_at: "",
    maintenance_category: "",
  });
  const [newTicketForm, setNewTicketForm] = useState({
    property_id: "",
    type: "maintenance",
    issue: "",
    priority: "medium",
    assigned_to: "",
    sla_due_at: "",
    maintenance_category: "",
  });
  const [creating, setCreating] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalValue, setAssignModalValue] = useState("");
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityModalValue, setPriorityModalValue] = useState("medium");
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  // Fetch tickets and properties on component mount
  useEffect(() => {
    fetchTickets();
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authFetch(`${API_BASE_URL}/properties`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: Property[] = await response.json();
      console.log("Fetched properties:", data);
      setProperties(data);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      // Don't show error - silently fail
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching tickets from:", `${API_BASE_URL}/tickets/`);

      // Create abort controller with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authFetch(`${API_BASE_URL}/tickets/`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Handle both array and object responses
      let ticketList: Ticket[] = [];
      if (Array.isArray(data)) {
        ticketList = data;
      } else if (data.tickets && Array.isArray(data.tickets)) {
        ticketList = data.tickets;
      } else if (data.data && Array.isArray(data.data)) {
        ticketList = data.data;
      } else {
        console.warn("Unexpected data format:", data);
        ticketList = [];
      }

      console.log("Parsed tickets:", ticketList);
      setTickets(ticketList);
      setLoading(false);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch tickets";
      console.error("Fetch error:", errorMsg, err);
      setError(errorMsg);
      setLoading(false);
    }
  };

  const openEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setEditTicketForm({
      property_id: ticket.property_id?.toString() || "",
      type: ticket.type,
      issue: ticket.issue,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to || "",
      status: ticket.status,
      sla_due_at: ticket.sla_due_at || "",
      maintenance_category: ticket.maintenance_category || "",
    });
    setShowEditTicketModal(true);
  };

  const updateTicket = async () => {
    if (!editingTicket) return;

    try {
      setCreating(true);
      console.log("Updating ticket", editingTicket.id, "with:", editTicketForm);

      // Only include sla_due_at if it has a value
      const payload: Record<string, any> = {
        ...editTicketForm,
        sla_due_at: editTicketForm.sla_due_at || undefined,
      };

      // Remove undefined fields
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      const response = await authFetch(
        `${API_BASE_URL}/tickets/${editingTicket.id}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      console.log("Update response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);

        try {
          const errorJson = JSON.parse(errorText);
          // Extract short error message
          if (errorJson.detail && Array.isArray(errorJson.detail)) {
            const firstError = errorJson.detail[0];
            const fieldName = firstError.loc?.[1] || "field";
            const msg = firstError.msg || "Invalid input";
            throw new Error(`${fieldName}: ${msg}`);
          } else if (errorJson.detail) {
            throw new Error(errorJson.detail);
          }
        } catch (e) {
          if (e instanceof Error) throw e;
        }
        throw new Error(`Failed to update ticket: ${response.status}`);
      }

      const updatedTicket = await response.json();
      console.log("Updated ticket:", updatedTicket);

      setShowEditTicketModal(false);
      setEditingTicket(null);

      // Refresh ticket list
      await fetchTickets();
      toast.success("Ticket updated successfully!");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update ticket";
      console.error("Update error:", errorMsg, err);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const bulkUpdate = async (updates: Record<string, any>) => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one ticket");
      return;
    }

    try {
      setCreating(true);
      console.log("Bulk updating", selectedIds.size, "tickets with:", updates);

      const updatePromises = Array.from(selectedIds).map((id) =>
        authFetch(`${API_BASE_URL}/tickets/${id}`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }),
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((r) => r.ok);

      if (!allOk) {
        throw new Error("Some tickets failed to update");
      }

      setSelectedIds(new Set());
      await fetchTickets();
      toast.success(`${selectedIds.size} ticket(s) updated successfully!`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update tickets";
      console.error("Bulk update error:", errorMsg, err);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const createTicket = async () => {
    if (!newTicketForm.property_id || !newTicketForm.issue) {
      toast.error("Property and Issue are required!");
      return;
    }

    try {
      setCreating(true);
      console.log("Creating ticket with:", newTicketForm);

      // Build payload - convert property_id to number
      const payload: Record<string, any> = {
        property_id: parseInt(newTicketForm.property_id as string),
        type: newTicketForm.type,
        issue: newTicketForm.issue,
        priority: newTicketForm.priority,
      };

      // Add optional fields if provided
      if (newTicketForm.assigned_to)
        payload.assigned_to = newTicketForm.assigned_to;
      if (newTicketForm.sla_due_at)
        payload.sla_due_at = newTicketForm.sla_due_at;

      // Only include maintenance_category if type is "maintenance"
      if (
        newTicketForm.type === "maintenance" &&
        newTicketForm.maintenance_category
      ) {
        payload.maintenance_category = newTicketForm.maintenance_category;
      }

      const response = await authFetch(`${API_BASE_URL}/tickets/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Create response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);

        try {
          const errorJson = JSON.parse(errorText);
          // Extract short error message
          if (errorJson.detail && Array.isArray(errorJson.detail)) {
            const firstError = errorJson.detail[0];
            const fieldName = firstError.loc?.[1] || "field";
            const msg = firstError.msg || "Invalid input";
            throw new Error(`${fieldName}: ${msg}`);
          } else if (errorJson.detail) {
            throw new Error(errorJson.detail);
          }
        } catch (e) {
          if (e instanceof Error) throw e;
        }
        throw new Error(`Failed to create ticket: ${response.status}`);
      }

      const createdTicket = await response.json();
      console.log("Created ticket:", createdTicket);

      // Reset form and close modal
      setNewTicketForm({
        property_id: "",
        type: "maintenance",
        issue: "",
        priority: "medium",
        assigned_to: "",
        sla_due_at: "",
        maintenance_category: "",
      });
      setShowNewTicketModal(false);

      // Refresh ticket list
      await fetchTickets();
      toast.success("Ticket created successfully!");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create ticket";
      console.error("Create error:", errorMsg, err);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const getSLAColor = (ticket: Ticket) => {
    if (!ticket.sla_due_at)
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800";

    const now = new Date();
    const dueDate = new Date(ticket.sla_due_at);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 2)
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50";
    if (diffHours < 8)
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/50";
    return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/50";
  };

  const getSLAIndicator = (ticket: Ticket) => {
    if (!ticket.sla_due_at) return "⚪";

    const now = new Date();
    const dueDate = new Date(ticket.sla_due_at);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 2) return "🔴";
    if (diffHours < 8) return "🟡";
    return "🟢";
  };

  const formatSLATime = (ticket: Ticket) => {
    if (!ticket.sla_due_at) return "No SLA";

    const now = new Date();
    const dueDate = new Date(ticket.sla_due_at);
    const diffMs = dueDate.getTime() - now.getTime();

    if (diffMs < 0) return "OVERDUE";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      Medium:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      High: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return (
      colors[priority] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      "In Progress":
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      Waiting:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      Closed:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getPropertyName = (propertyId?: number) => {
    if (!propertyId) return "Unknown";
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.name : "Unknown";
  };

  const toggleRow = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Filter tickets based on all filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const statusMatch =
        filterStatus === "all" ||
        ticket.status.toLowerCase() === filterStatus.toLowerCase();
      const priorityMatch =
        filterPriority === "all" ||
        ticket.priority.toLowerCase() === filterPriority.toLowerCase();
      const typeMatch =
        filterType === "all" ||
        ticket.type.toLowerCase() === filterType.toLowerCase();
      const propertyMatch =
        filterProperty === "all" ||
        ticket.property_id?.toString() === filterProperty;
      const assignedMatch =
        filterAssigned === "all" ||
        (filterAssigned === "unassigned" && !ticket.assigned_to) ||
        (filterAssigned !== "unassigned" &&
          ticket.assigned_to === filterAssigned);
      const searchMatch =
        searchQuery === "" ||
        ticket.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.property.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        statusMatch &&
        priorityMatch &&
        typeMatch &&
        propertyMatch &&
        assignedMatch &&
        searchMatch
      );
    });
  }, [
    tickets,
    filterStatus,
    filterPriority,
    filterType,
    filterProperty,
    filterAssigned,
    searchQuery,
  ]);

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedIds.has(t.id)),
    [tickets, selectedIds],
  );
  const allSelectedClosed =
    selectedTickets.length > 0 &&
    selectedTickets.every((t) => t.status?.toLowerCase() === "closed");

  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tickets</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and track all support tickets
            </p>
          </div>
          <Button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="size-4" />
            <span>New Ticket</span>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Error Loading Tickets
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  {error}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={fetchTickets}>
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      console.log("API_BASE_URL:", API_BASE_URL);
                      toast.info(
                        `Trying to connect to: ${API_BASE_URL}/tickets/`,
                      );
                    }}
                  >
                    Debug Info
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 items-end">
              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Priority
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="complaint">Complaint</option>
                  <option value="refund">Refund</option>
                  <option value="task">Task</option>
                </select>
              </div>

              {/* Property Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Property
                </label>
                <select
                  value={filterProperty}
                  onChange={(e) => setFilterProperty(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Properties</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id.toString()}>
                      {prop.name} ({prop.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Assigned
                </label>
                <select
                  value={filterAssigned}
                  onChange={(e) => setFilterAssigned(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  {[
                    ...new Set(
                      tickets
                        .filter((t) => t.assigned_to)
                        .map((t) => t.assigned_to),
                    ),
                  ].map((assigned) => (
                    <option key={assigned} value={assigned}>
                      {assigned}
                    </option>
                  ))}
                </select>
              </div>

              {/* SLA Filter - Hidden for now, can be enhanced later */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  SLA Risk
                </label>
                <select className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs">
                  <option>All</option>
                  <option>At Risk</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Search
                </label>
                <div className="flex items-center border border-input rounded-md px-2 bg-background h-8">
                  <Search className="size-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 focus-visible:ring-0 text-xs h-6 px-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {tickets.length === 0
                    ? "No tickets found"
                    : "No tickets match your filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-accent/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === filteredTickets.length &&
                            filteredTickets.length > 0
                          }
                          onChange={() => {
                            if (selectedIds.size === filteredTickets.length) {
                              setSelectedIds(new Set());
                            } else {
                              setSelectedIds(
                                new Set(
                                  filteredTickets.map((t: Ticket) => t.id),
                                ),
                              );
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        ID
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Property
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Type
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Issue
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Priority
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        SLA
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Assigned
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTickets.map((ticket: Ticket) => (
                      <tr
                        key={ticket.id}
                        className={`hover:bg-accent/30 transition-colors cursor-pointer ${
                          selectedIds.has(ticket.id)
                            ? "bg-blue-50 dark:bg-blue-950/50"
                            : ""
                        }`}
                        onClick={() => openEditTicket(ticket)}
                      >
                        <td
                          className="px-4 py-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ticket.id)}
                            onChange={() => toggleRow(ticket.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-primary">
                          #{ticket.id}
                        </td>
                        <td className="px-4 py-2.5">
                          {getPropertyName(ticket.property_id)}
                        </td>
                        <td className="px-4 py-2.5 capitalize">
                          {ticket.type}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate">
                          {ticket.issue}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getPriorityColor(ticket.priority)}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-2.5 font-semibold ${getSLAColor(ticket)}`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {getSLAIndicator(ticket)} {formatSLATime(ticket)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {!ticket.assigned_to ? (
                            <span className="text-muted-foreground italic">
                              Unassigned
                            </span>
                          ) : (
                            ticket.assigned_to
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedIds.size} ticket{selectedIds.size > 1 ? "s" : ""}{" "}
                  selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignModalValue("");
                      setShowAssignModal(true);
                    }}
                  >
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPriorityModalValue("medium");
                      setShowPriorityModal(true);
                    }}
                  >
                    Change Priority
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEscalateModal(true)}
                  >
                    Escalate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
                    disabled={allSelectedClosed}
                    onClick={() => bulkUpdate({ status: "closed" })}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground">
          Showing {filteredTickets.length} of {tickets.length} tickets{" "}
          {loading && "(Loading...)"}
        </div>
      </div>

      {/* Edit Ticket Modal */}
      {showEditTicketModal && editingTicket && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Edit Ticket #{editingTicket.id}
                </h2>
                <button
                  onClick={() => setShowEditTicketModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Property */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Property
                  </label>
                  <select
                    value={editTicketForm.property_id}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        property_id: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="">-- Select Property --</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} ({prop.address})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Status
                  </label>
                  <select
                    value={editTicketForm.status}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        status: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Type
                  </label>
                  <select
                    value={editTicketForm.type}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        type: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="complaint">Complaint</option>
                    <option value="refund">Refund</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Priority
                  </label>
                  <select
                    value={editTicketForm.priority}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        priority: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Assign To
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={editTicketForm.assigned_to}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        assigned_to: e.target.value,
                      })
                    }
                  />
                </div>

                {/* SLA Due Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    SLA Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={editTicketForm.sla_due_at}
                    onChange={(e) =>
                      setEditTicketForm({
                        ...editTicketForm,
                        sla_due_at: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Issue Description
                </label>
                <textarea
                  placeholder="Describe the issue..."
                  value={editTicketForm.issue}
                  onChange={(e) =>
                    setEditTicketForm({
                      ...editTicketForm,
                      issue: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-input rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={updateTicket}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? "Updating..." : "Update Ticket"}
                </Button>
                <Button
                  onClick={() => setShowEditTicketModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Assign Tickets</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Assign {selectedIds.size} ticket
                {selectedIds.size > 1 ? "s" : ""} to:
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Assign To
                </label>
                <Input
                  list="assignee-list"
                  placeholder="Enter assignee name..."
                  value={assignModalValue}
                  onChange={(e) => setAssignModalValue(e.target.value)}
                  className="h-9"
                />
                <datalist id="assignee-list">
                  {[
                    ...new Set(
                      tickets
                        .filter((t) => t.assigned_to)
                        .map((t) => t.assigned_to as string),
                    ),
                  ].map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (assignModalValue.trim()) {
                      bulkUpdate({ assigned_to: assignModalValue.trim() });
                      setShowAssignModal(false);
                    } else {
                      toast.error("Please enter an assignee name");
                    }
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Priority Modal */}
      {showPriorityModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Change Priority</h2>
                <button
                  onClick={() => setShowPriorityModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Set priority for {selectedIds.size} ticket
                {selectedIds.size > 1 ? "s" : ""}:
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Priority
                </label>
                <select
                  value={priorityModalValue}
                  onChange={(e) =>
                    setPriorityModalValue(
                      e.target.value as "low" | "medium" | "high",
                    )
                  }
                  className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    bulkUpdate({ priority: priorityModalValue });
                    setShowPriorityModal(false);
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  Update Priority
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPriorityModal(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Escalate Tickets</h2>
                <button
                  onClick={() => setShowEscalateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Escalate {selectedIds.size} ticket
                {selectedIds.size > 1 ? "s" : ""}? This will set their status to
                In Progress.
              </p>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    bulkUpdate({ status: "in_progress" });
                    setShowEscalateModal(false);
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEscalateModal(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Create New Ticket</h2>
                <button
                  onClick={() => setShowNewTicketModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Property */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Property *
                  </label>
                  <select
                    value={newTicketForm.property_id}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        property_id: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="">-- Select Property --</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} ({prop.address})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Type
                  </label>
                  <select
                    value={newTicketForm.type}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        type: e.target.value,
                        maintenance_category: "", // Reset category when type changes
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="complaint">Complaint</option>
                    <option value="refund">Refund</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                {/* Maintenance Category - Only shown when type is "maintenance" */}
                {newTicketForm.type === "maintenance" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Maintenance Category
                    </label>
                    <select
                      value={newTicketForm.maintenance_category}
                      onChange={(e) =>
                        setNewTicketForm({
                          ...newTicketForm,
                          maintenance_category: e.target.value,
                        })
                      }
                      className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="">-- Select Category --</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="hvac">HVAC</option>
                      <option value="electrical">Electrical</option>
                    </select>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Priority
                  </label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        priority: e.target.value,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Assign To
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={newTicketForm.assigned_to}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        assigned_to: e.target.value,
                      })
                    }
                  />
                </div>

                {/* SLA Due Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    SLA Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={newTicketForm.sla_due_at}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        sla_due_at: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Issue Description *
                </label>
                <textarea
                  placeholder="Describe the issue..."
                  value={newTicketForm.issue}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      issue: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-input rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={createTicket}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? "Creating..." : "Create Ticket"}
                </Button>
                <Button
                  onClick={() => setShowNewTicketModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SimpleLayout>
  );
}
