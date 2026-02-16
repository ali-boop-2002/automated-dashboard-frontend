import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  AlertCircle,
  Ticket,
  DollarSign,
  Wrench,
  Clock,
  CheckCircle,
  User,
  Loader,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { env } from "@/env";

const API_BASE_URL = env.VITE_API_BASE_URL;

function parseApiErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return "Failed to update unit";
}

interface Ticket {
  id: number;
  property_id: number;
  type: string;
  issue: string;
  priority: string;
  status: string;
  assigned_to: string;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
}

interface Approval {
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

interface Unit {
  id: number;
  property_id: number;
  unit_number: number;
  rent_amount: string | null;
  rent_date: string | null;
  occupied: boolean;
  paid: boolean;
  over_due: boolean;
  created_at: string;
  updated_at: string;
}

interface PropertyDetail {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  total_units: number;
  manager_name?: string;
  status: string;
  tickets_count?: number;
  open_tickets_count?: number;
  high_priority_tickets_count?: number;
  created_at?: string;
  updated_at?: string;
  tickets: Ticket[];
  approvals: Approval[];
  units?: Unit[];
}

interface PropertyDetailModalProps {
  isOpen: boolean;
  property: any;
  onClose: () => void;
  onDeleted?: () => void;
}

export function PropertyDetailModal({
  isOpen,
  property,
  onClose,
  onDeleted,
}: PropertyDetailModalProps) {
  const [propertyData, setPropertyData] = useState<PropertyDetail | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editingUnitValues, setEditingUnitValues] = useState<{
    rent_amount: string;
    occupied: boolean;
    rent_date: string;
    paid: boolean;
  }>({ rent_amount: "", occupied: false, rent_date: "", paid: false });
  const [savingUnitId, setSavingUnitId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteProperty = async () => {
    if (!propertyData) return;
    try {
      setDeleting(true);
      const response = await fetch(
        `${API_BASE_URL}/properties/${propertyData.id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message =
          typeof errData?.detail === "string"
            ? errData.detail
            : (errData?.message ?? "Failed to delete property");
        throw new Error(message);
      }
      toast.success(`Property "${propertyData.name}" has been deleted.`);
      setDeleteDialogOpen(false);
      onDeleted?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete property";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !property) return;

    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/properties/${property.id}`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch property details: ${response.status}`,
          );
        }

        const data: PropertyDetail = await response.json();
        console.log("Fetched property details:", data);
        setPropertyData(data);

        // Fetch units for this property
        await fetchUnits(property.id);
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load property details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [isOpen, property]);

  const fetchUnits = async (propertyId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/units?property_id=${propertyId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch units");
      }

      const data: Unit[] = await response.json();
      console.log("Fetched units:", data);
      setUnits(data);
    } catch (err) {
      console.error("Error fetching units:", err);
      // Don't fail the whole modal if units fail to load
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setEditingUnitValues({
      rent_amount: unit.rent_amount != null ? String(unit.rent_amount) : "",
      occupied: unit.occupied,
      rent_date: unit.rent_date ? unit.rent_date.split("T")[0] : "",
      paid: unit.paid,
    });
  };

  const handleSaveUnit = async (unitId: number) => {
    try {
      setSavingUnitId(unitId);

      const payload: Record<string, any> = {
        rent_date: editingUnitValues.rent_date
          ? `${editingUnitValues.rent_date}T00:00:00Z`
          : null,
        paid: editingUnitValues.paid,
        occupied: editingUnitValues.occupied,
      };

      if (editingUnitValues.rent_amount !== "") {
        payload.rent_amount = editingUnitValues.rent_amount;
      }

      const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = parseApiErrorDetail(errorData.detail);
        throw new Error(message);
      }

      const updated = await response.json();
      console.log("Unit updated:", updated);

      // Update the units list
      setUnits(units.map((u) => (u.id === unitId ? updated : u)));
      setEditingUnitId(null);
    } catch (err) {
      console.error("Error updating unit:", err);
      const message =
        err instanceof Error ? err.message : "Failed to update unit";
      toast.error(
        typeof message === "string" && message !== "[object Object]"
          ? message
          : "Failed to update unit",
      );
    } finally {
      setSavingUnitId(null);
    }
  };

  const handleCancelEditUnit = () => {
    setEditingUnitId(null);
    setEditingUnitValues({
      rent_amount: "",
      occupied: false,
      rent_date: "",
      paid: false,
    });
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-xl p-8 flex items-center gap-3">
          <Loader className="size-5 animate-spin" />
          <p>Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !propertyData) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400">
                Error Loading Property
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      attention:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
      critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return (
      colors[status.toLowerCase()] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "healthy") return "🟢";
    if (lower === "attention") return "🟡";
    return "🔴";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      medium:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return (
      colors[priority.toLowerCase()] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getTicketStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      in_progress:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      waiting:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      closed:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
    return (
      colors[status.toLowerCase()] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getApprovalStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      approved:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return (
      colors[status.toLowerCase()] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const activeTickets = propertyData.tickets.filter(
    (t) => t.status.toLowerCase() !== "closed",
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="border-b p-6 flex items-center justify-between sticky top-0 bg-background">
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              PROPERTY
            </p>
            <h2 className="text-2xl font-bold mt-1">{propertyData.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800"
              aria-label="Delete property"
            >
              {deleting ? (
                <Loader className="size-4 animate-spin shrink-0" />
              ) : (
                <Trash2 className="size-4 shrink-0" />
              )}
              <span>{deleting ? "Deleting..." : "Delete"}</span>
            </Button>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete property?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{propertyData?.name}"? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteProperty();
                    }}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header Section - Property Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/50 dark:to-blue-950/30">
              <p className="text-xs text-muted-foreground font-medium">
                Address
              </p>
              <p className="font-semibold mt-2">{propertyData.address}</p>
            </div>

            <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/50 dark:to-purple-950/30">
              <p className="text-xs text-muted-foreground font-medium">
                Property Manager
              </p>
              <p className="font-semibold mt-2 flex items-center gap-2">
                <User className="size-4" />
                {propertyData.manager_name || "Unassigned"}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-indigo-50/50 dark:from-indigo-950/50 dark:to-indigo-950/30">
              <p className="text-xs text-muted-foreground font-medium">
                Total Units
              </p>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                {propertyData.total_units}
              </p>
            </div>

            <div
              className={`border rounded-lg p-4 bg-gradient-to-br ${
                propertyData.status?.toLowerCase() === "healthy"
                  ? "from-green-50 to-green-50/50 dark:from-green-950/50 dark:to-green-950/30"
                  : propertyData.status?.toLowerCase() === "attention"
                    ? "from-yellow-50 to-yellow-50/50 dark:from-yellow-950/50 dark:to-yellow-950/30"
                    : "from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-950/30"
              }`}
            >
              <p className="text-xs text-muted-foreground font-medium">
                Status
              </p>
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-2 ${getStatusColor(propertyData.status)}`}
              >
                {getStatusIcon(propertyData.status)} {propertyData.status}
              </span>
            </div>
          </div>

          {/* Property Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Open Tickets
                    </p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-2">
                      {propertyData.open_tickets_count || 0}
                    </p>
                  </div>
                  <Ticket className="size-8 text-orange-300 dark:text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Pending Approvals
                    </p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-2">
                      {
                        propertyData.approvals.filter(
                          (a) => a.status.toLowerCase() === "pending",
                        ).length
                      }
                    </p>
                  </div>
                  <DollarSign className="size-8 text-purple-300 dark:text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Total Approvals
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                      {propertyData.approvals.length}
                    </p>
                  </div>
                  <DollarSign className="size-8 text-blue-300 dark:text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      High Priority
                    </p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">
                      {propertyData.high_priority_tickets_count || 0}
                    </p>
                  </div>
                  <AlertCircle className="size-8 text-red-300 dark:text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Tickets Section */}
          {activeTickets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="size-4" />
                  Active Tickets ({activeTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b bg-accent/30">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          ID
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Type
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Issue
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Priority
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Status
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Assigned To
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-accent/20 transition-colors"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-primary">
                            #{ticket.id}
                          </td>
                          <td className="px-3 py-2 capitalize">
                            {ticket.type}
                          </td>
                          <td className="px-3 py-2 truncate">{ticket.issue}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                            >
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getTicketStatusColor(ticket.status)}`}
                            >
                              {ticket.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-3 py-2">{ticket.assigned_to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Units Section */}
          {units.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🏠 Units ({units.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b bg-accent/30">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          Unit #
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Rent Amount
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Rent Date
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Paid
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Occupied
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Overdue
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {units.map((unit) => (
                        <tr
                          key={unit.id}
                          className={`hover:bg-accent/20 transition-colors ${editingUnitId === unit.id ? "bg-blue-50 dark:bg-blue-950/50" : ""}`}
                        >
                          <td className="px-3 py-2 font-semibold">
                            Unit {unit.unit_number}
                          </td>
                          <td className="px-3 py-2">
                            {editingUnitId === unit.id ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Rent amount"
                                value={editingUnitValues.rent_amount}
                                onChange={(e) =>
                                  setEditingUnitValues({
                                    ...editingUnitValues,
                                    rent_amount: e.target.value,
                                  })
                                }
                                disabled={savingUnitId === unit.id}
                                className="px-2 py-1 border border-input rounded text-xs w-24"
                              />
                            ) : unit.rent_amount ? (
                              `$${parseFloat(unit.rent_amount).toFixed(2)}`
                            ) : (
                              "Not set"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {editingUnitId === unit.id ? (
                              <input
                                type="date"
                                value={editingUnitValues.rent_date}
                                onChange={(e) =>
                                  setEditingUnitValues({
                                    ...editingUnitValues,
                                    rent_date: e.target.value,
                                  })
                                }
                                disabled={savingUnitId === unit.id}
                                className="px-2 py-1 border border-input rounded text-xs"
                              />
                            ) : unit.rent_date ? (
                              new Date(unit.rent_date).toLocaleDateString()
                            ) : (
                              "Not set"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {editingUnitId === unit.id ? (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingUnitValues.paid}
                                  onChange={(e) =>
                                    setEditingUnitValues({
                                      ...editingUnitValues,
                                      paid: e.target.checked,
                                    })
                                  }
                                  disabled={savingUnitId === unit.id}
                                />
                                <span className="text-xs">
                                  {editingUnitValues.paid ? "Yes" : "No"}
                                </span>
                              </label>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${unit.paid ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}
                              >
                                {unit.paid ? "✓ Paid" : "✗ Unpaid"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {editingUnitId === unit.id ? (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingUnitValues.occupied}
                                  onChange={(e) =>
                                    setEditingUnitValues({
                                      ...editingUnitValues,
                                      occupied: e.target.checked,
                                    })
                                  }
                                  disabled={savingUnitId === unit.id}
                                />
                                <span className="text-xs">
                                  {editingUnitValues.occupied ? "Yes" : "No"}
                                </span>
                              </label>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${
                                  unit.occupied
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                                }`}
                              >
                                {unit.occupied ? "🟢 Occupied" : "🟠 Vacant"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${unit.over_due ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}
                            >
                              {unit.over_due ? "⚠️ Overdue" : "✓ OK"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {editingUnitId === unit.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveUnit(unit.id)}
                                  disabled={savingUnitId === unit.id}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
                                >
                                  {savingUnitId === unit.id
                                    ? "Saving..."
                                    : "Save"}
                                </button>
                                <button
                                  onClick={handleCancelEditUnit}
                                  disabled={savingUnitId === unit.id}
                                  className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditUnit(unit)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approvals Section */}
          {propertyData.approvals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Approvals Related to This Property (
                  {propertyData.approvals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {propertyData.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm">
                          {approval.type.charAt(0).toUpperCase() +
                            approval.type.slice(1).replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {approval.id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested by: {approval.requested_by}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-green-700 dark:text-green-400">
                            $
                            {approval.amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(approval.due_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getApprovalStatusColor(approval.status)}`}
                        >
                          {approval.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty States */}
          {activeTickets.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Ticket className="size-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No active tickets for this property
                </p>
              </CardContent>
            </Card>
          )}

          {propertyData.approvals.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No approvals for this property
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
