import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, DollarSign, Clock, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ApprovalDetailModal } from "@/components/approval-detail-modal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/approvals")({
  component: ApprovalsPage,
});

import { env } from "@/env";

const API_BASE_URL = env.VITE_API_BASE_URL;

interface ApiApproval {
  id: string;
  type: string;
  status: string;
  amount: number;
  ticket_id: number;
  property_id: number;
  requested_by: string;
  due_at: string;
  created_at: string;
}

interface Approval {
  id: string;
  type: "refund" | "credit" | "vendor_payment" | string;
  relatedTicket: string;
  ticket_id: number;
  property_id: number;
  property: string;
  amount: number;
  requestedBy: string;
  age: number; // in hours
  status: "pending" | "approved" | "rejected" | string;
  dueTime: string;
  createdAt: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  total_units: number;
  manager_name?: string;
  status?: string;
}

interface Ticket {
  id: number | string;
  property_id?: number;
  issue: string;
  assigned_to?: string;
}

function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    overdueCount: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [amountRangeFilter, setAmountRangeFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [requestedByFilter, setRequestedByFilter] = useState("all");

  // New approval modal state
  const [showNewApprovalModal, setShowNewApprovalModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyTickets, setPropertyTickets] = useState<Ticket[]>([]);
  const [loadingPropertyTickets, setLoadingPropertyTickets] = useState(false);
  const [newApprovalForm, setNewApprovalForm] = useState({
    id: "",
    type: "refund",
    amount: "",
    ticket_id: "",
    property_id: "",
    due_at: "",
  });

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/approvals/stats`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched approval stats:", data);

      setStats({
        pendingCount: data.pending || 0,
        pendingAmount: data.pending_amount || 0,
        overdueCount: data.overdue || 0,
      });
    } catch (err) {
      console.error("Failed to fetch approval stats:", err);
      // Don't show error toast for stats - silently fail and use zeros
    }
  };

  // Fetch approvals from API
  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/approvals`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ApiApproval[] = await response.json();
      console.log("Fetched approvals:", data);

      // Transform API data to component format
      const transformed: Approval[] = data.map((approval) => {
        const createdAt = new Date(approval.created_at);
        const now = new Date();
        const ageInHours = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
        );

        return {
          id: approval.id,
          type: approval.type.toLowerCase().replace(" ", "_"),
          relatedTicket: `#${approval.ticket_id}`,
          ticket_id: approval.ticket_id,
          property_id: approval.property_id,
          property:
            properties.find((p) => p.id === approval.property_id)?.address ||
            properties.find((p) => p.id === approval.property_id)?.name ||
            "Unknown",
          amount: approval.amount,
          requestedBy: approval.requested_by,
          age: ageInHours,
          status: approval.status.toLowerCase(),
          dueTime: approval.due_at || "N/A",
          createdAt: approval.created_at,
        };
      });

      setApprovals(transformed);
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch approvals",
      );
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    fetchStats();
    fetchProperties();
  }, []);

  // Calculate KPIs
  const pendingCount = stats.pendingCount;
  const totalAmount = stats.pendingAmount;
  const overdueCount = stats.overdueCount;

  // Apply filters
  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      if (statusFilter !== "all" && approval.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && approval.type !== typeFilter) return false;
      if (
        propertyFilter !== "all" &&
        getPropertyDisplay(approval.property_id) !== propertyFilter
      )
        return false;
      if (
        requestedByFilter !== "all" &&
        approval.requestedBy !== requestedByFilter
      )
        return false;

      if (amountRangeFilter !== "all") {
        const amount = approval.amount;
        if (amountRangeFilter === "under_300" && amount >= 300) return false;
        if (amountRangeFilter === "300_1000" && (amount < 300 || amount > 1000))
          return false;
        if (amountRangeFilter === "over_1000" && amount <= 1000) return false;
      }

      return true;
    });
  }, [
    approvals,
    properties,
    statusFilter,
    typeFilter,
    amountRangeFilter,
    propertyFilter,
    requestedByFilter,
  ]);

  const handleRowClick = (approval: Approval) => {
    setSelectedApproval(approval);
    setIsModalOpen(true);
  };

  const handleApprovalDecision = async (
    approvalId: string,
    decision: "approved" | "rejected",
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update approval: ${response.status}`);
      }

      // Update local state
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, status: decision } : a)),
      );

      setIsModalOpen(false);
      setSelectedApproval(null);
      toast.success(`Approval ${decision}`);
    } catch (err) {
      console.error("Failed to update approval:", err);
      toast.error("Failed to update approval");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      refund: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      credit: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      vendor_payment: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      refund: "Refund",
      credit: "Credit",
      vendor_payment: "Vendor Payment",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getAgeIcon = (age: number) => {
    if (age > 24) return "🔴";
    if (age > 12) return "🟠";
    return "🟡";
  };

  const getPropertyDisplay = (propertyId: number) => {
    const p = properties.find((pr) => pr.id === propertyId);
    return p?.address || p?.name || "Unknown";
  };

  // Get unique values for filter dropdowns
  const requestedByList = [
    "All",
    ...new Set(approvals.map((a) => a.requestedBy)),
  ];
  const types = ["All", "refund", "credit", "vendor_payment"];
  const statuses = ["All", "pending", "approved", "rejected"];

  // Fetch properties
  const fetchProperties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties`);
      if (!response.ok) throw new Error("Failed to fetch properties");
      const data: Property[] = await response.json();
      setProperties(data);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    }
  };

  // Fetch tickets for the selected property only (called when property is chosen)
  const fetchTicketsForProperty = async (propertyId: string) => {
    if (!propertyId) {
      setPropertyTickets([]);
      return;
    }
    try {
      setLoadingPropertyTickets(true);
      setPropertyTickets([]);
      const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`);
      if (!response.ok) throw new Error("Failed to fetch property tickets");
      const data = await response.json();
      const ticketsList = data.tickets || [];
      setPropertyTickets(ticketsList);
    } catch (err) {
      console.error("Failed to fetch property tickets:", err);
      setPropertyTickets([]);
      toast.error("Failed to load tickets for this property");
    } finally {
      setLoadingPropertyTickets(false);
    }
  };

  // Create approval
  const createApproval = async () => {
    if (
      !newApprovalForm.id ||
      !newApprovalForm.amount ||
      !newApprovalForm.ticket_id ||
      !newApprovalForm.property_id
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedTicket = propertyTickets.find(
      (t) => String(t.id) === newApprovalForm.ticket_id,
    );
    const requestedBy = selectedTicket?.assigned_to || "Unassigned";

    try {
      setCreating(true);

      const payload = {
        id: newApprovalForm.id,
        type: newApprovalForm.type,
        amount: parseFloat(newApprovalForm.amount),
        ticket_id: parseInt(newApprovalForm.ticket_id),
        property_id: parseInt(newApprovalForm.property_id),
        requested_by: requestedBy,
      };

      if (newApprovalForm.due_at) {
        Object.assign(payload, { due_at: newApprovalForm.due_at });
      }

      console.log("Creating approval with payload:", payload);

      const response = await fetch(`${API_BASE_URL}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
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
        throw new Error(`Failed to create approval: ${response.status}`);
      }

      const createdApproval = await response.json();
      console.log("Approval created:", createdApproval);

      // Reset form and close modal
      setNewApprovalForm({
        id: "",
        type: "refund",
        amount: "",
        ticket_id: "",
        property_id: "",
        due_at: "",
      });
      setShowNewApprovalModal(false);

      // Refresh approvals list
      await fetchApprovals();
      await fetchStats();

      toast.success("Approval created successfully");
    } catch (err) {
      console.error("Failed to create approval:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create approval";
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage financial approvals
          </p>
        </div>

        {/* New Approval Button */}
        <div>
          <Button
            onClick={() => {
              setNewApprovalForm({
                id: "",
                type: "refund",
                amount: "",
                ticket_id: "",
                property_id: "",
                due_at: "",
              });
              setPropertyTickets([]);
              setShowNewApprovalModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + New Approval
          </Button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Approvals Card */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-50/50 dark:border-orange-800 dark:from-orange-950/50 dark:to-orange-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Pending Approvals
                  </p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-400 mt-2">
                    {pendingCount}
                  </p>
                </div>
                <AlertCircle className="size-10 text-orange-300 dark:text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {/* Financial Impact Card */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-50/50 dark:border-green-800 dark:from-green-950/50 dark:to-green-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Financial Impact
                  </p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
                    ${totalAmount.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="size-10 text-green-300 dark:text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Overdue Decisions Card */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 dark:border-red-800 dark:from-red-950/50 dark:to-red-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Overdue Decisions
                  </p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2">
                    {overdueCount}
                  </p>
                </div>
                <Clock className="size-10 text-red-300 dark:text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status.toLowerCase()}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  {types.map((type) => (
                    <option key={type} value={type.toLowerCase()}>
                      {type.toLowerCase() === "all"
                        ? "All"
                        : getTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Range Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Amount
                </label>
                <select
                  value={amountRangeFilter}
                  onChange={(e) => setAmountRangeFilter(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All</option>
                  <option value="under_300">Under $300</option>
                  <option value="300_1000">$300-$1000</option>
                  <option value="over_1000">Over $1000</option>
                </select>
              </div>

              {/* Property Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Property
                </label>
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Properties</option>
                  {[
                    ...new Set(
                      approvals.map((a) => getPropertyDisplay(a.property_id)),
                    ),
                  ]
                    .filter((p) => p !== "Unknown")
                    .map((prop) => (
                      <option key={prop} value={prop}>
                        {prop}
                      </option>
                    ))}
                </select>
              </div>

              {/* Requested By Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Requested By
                </label>
                <select
                  value={requestedByFilter}
                  onChange={(e) => setRequestedByFilter(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  {requestedByList.map((person) => (
                    <option key={person} value={person.toLowerCase()}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Button */}
              <div>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    // Filters already applied via state
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approvals Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading approvals...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
                <p className="text-red-700 text-sm font-medium">
                  Failed to load approvals
                </p>
                <p className="text-red-600 text-xs mt-1">{error}</p>
                <Button size="sm" onClick={fetchApprovals} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {approvals.length === 0
                    ? "No approvals found"
                    : "No approvals match your filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-accent/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        ID
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Type
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Related Ticket
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Property
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Amount
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Requested By
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Age
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Status
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredApprovals.map((approval: Approval) => (
                      <tr
                        key={approval.id}
                        className="hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(approval)}
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-primary">
                          {approval.id}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                              approval.type,
                            )}`}
                          >
                            {getTypeLabel(approval.type)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-blue-600">
                          {approval.relatedTicket}
                        </td>
                        <td className="px-4 py-2.5">
                          {getPropertyDisplay(approval.property_id)}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-green-700">
                          💲 ${approval.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">{approval.requestedBy}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {getAgeIcon(approval.age)}
                            {approval.age}h
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              approval.status,
                            )}`}
                          >
                            {getStatusLabel(approval.status)}
                          </span>
                        </td>
                        <td
                          className="px-4 py-2.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {approval.age > 24 &&
                            approval.status === "pending" && (
                              <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                ⚠️ Overdue
                              </span>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground">
          Showing {filteredApprovals.length} of {approvals.length} approvals
        </div>
      </div>

      {/* New Approval Modal */}
      {showNewApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Card className="w-full max-w-2xl mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Approval</h2>
                <button
                  onClick={() => setShowNewApprovalModal(false)}
                  disabled={creating}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* ID and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Approval ID *
                    </label>
                    <Input
                      placeholder="e.g., APR-001"
                      value={newApprovalForm.id}
                      onChange={(e) =>
                        setNewApprovalForm({
                          ...newApprovalForm,
                          id: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Type *
                    </label>
                    <select
                      value={newApprovalForm.type}
                      onChange={(e) =>
                        setNewApprovalForm({
                          ...newApprovalForm,
                          type: e.target.value,
                        })
                      }
                      disabled={creating}
                      className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="refund">Refund</option>
                      <option value="credit">Credit</option>
                      <option value="vendor_payment">Vendor Payment</option>
                    </select>
                  </div>
                </div>

                {/* Property first - required before tickets appear */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Property *
                  </label>
                  <select
                    value={newApprovalForm.property_id}
                    onChange={(e) => {
                      const propertyId = e.target.value;
                      setNewApprovalForm({
                        ...newApprovalForm,
                        property_id: propertyId,
                        ticket_id: "",
                      });
                      fetchTicketsForProperty(propertyId);
                    }}
                    disabled={creating}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="">-- Select Property First --</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ticket - only shown after property is selected */}
                {newApprovalForm.property_id && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">
                        Ticket *
                      </label>
                      <select
                        value={newApprovalForm.ticket_id}
                        onChange={(e) =>
                          setNewApprovalForm({
                            ...newApprovalForm,
                            ticket_id: e.target.value,
                          })
                        }
                        disabled={creating || loadingPropertyTickets}
                        className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="">
                          {loadingPropertyTickets
                            ? "Loading tickets..."
                            : "-- Select Ticket --"}
                        </option>
                        {!loadingPropertyTickets &&
                          propertyTickets.map((ticket) => (
                            <option key={ticket.id} value={ticket.id}>
                              #{ticket.id} - {ticket.issue}
                            </option>
                          ))}
                      </select>
                    </div>
                    {newApprovalForm.ticket_id && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">
                          Assigned To
                        </label>
                        <div className="h-9 px-2.5 py-2 rounded-md border border-input bg-muted/50 text-xs flex items-center">
                          {propertyTickets.find(
                            (t) => String(t.id) === newApprovalForm.ticket_id,
                          )?.assigned_to || "Unassigned"}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Amount ($) *
                  </label>
                  <Input
                    placeholder="e.g., 150.50"
                    type="number"
                    step="0.01"
                    value={newApprovalForm.amount}
                    onChange={(e) =>
                      setNewApprovalForm({
                        ...newApprovalForm,
                        amount: e.target.value,
                      })
                    }
                    disabled={creating}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Due Date
                  </label>
                  <Input
                    placeholder="YYYY-MM-DDTHH:MM:SSZ"
                    type="datetime-local"
                    value={newApprovalForm.due_at}
                    onChange={(e) =>
                      setNewApprovalForm({
                        ...newApprovalForm,
                        due_at: e.target.value,
                      })
                    }
                    disabled={creating}
                  />
                </div>

                {/* Note */}
                <p className="text-xs text-muted-foreground">
                  * Required fields
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNewApprovalModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createApproval}
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {creating ? "Creating..." : "Create Approval"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Detail Modal */}
      {selectedApproval && (
        <ApprovalDetailModal
          isOpen={isModalOpen}
          approval={selectedApproval}
          ticketId={selectedApproval.ticket_id}
          propertyId={selectedApproval.property_id}
          onClose={() => setIsModalOpen(false)}
          onApprove={() =>
            handleApprovalDecision(selectedApproval.id, "approved")
          }
          onReject={() =>
            handleApprovalDecision(selectedApproval.id, "rejected")
          }
        />
      )}
    </SimpleLayout>
  );
}
