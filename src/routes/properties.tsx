import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Home,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Search,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { PropertyDetailModal } from "@/components/property-detail-modal";
import { toast } from "sonner";
import { env } from "@/env";

export const Route = createFileRoute("/properties")({
  component: PropertiesPage,
});

const API_BASE_URL = env.VITE_API_BASE_URL;

interface ApiProperty {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  total_units: number;
  occupancy?: number;
  occupied_units_count?: number;
  manager_name?: string;
  status: string;
  tickets_count?: number;
  open_tickets_count?: number;
  high_priority_tickets_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  openTickets: number;
  highPriorityTickets: number;
  manager: string;
  status: "healthy" | "attention" | "critical" | string;
  lastActivity: string;
  pendingApprovals: number;
  upcomingMaintenance: number;
}

interface Stats {
  total_properties: number;
  active_issues: number;
  high_priority_issues: number;
  upcoming_appointments: number;
  sla_risks: number;
}

function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New property modal state
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPropertyForm, setNewPropertyForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    total_units: "",
    manager_name: "",
    status: "healthy",
  });

  // Stats state
  const [stats, setStats] = useState<Stats>({
    total_properties: 0,
    active_issues: 0,
    high_priority_issues: 0,
    upcoming_appointments: 0,
    sla_risks: 0,
  });

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/properties/stats`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched property stats:", data);

      setStats(data);
    } catch (err) {
      console.error("Failed to fetch property stats:", err);
      // Silently fail for stats
    }
  };

  // Fetch properties from API
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/properties`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ApiProperty[] = await response.json();
      console.log("Fetched properties:", data);

      // Transform API data to component format
      const transformed: Property[] = data.map((prop) => ({
        id: prop.id.toString(),
        name: prop.name,
        address: prop.address,
        units: prop.total_units,
        occupiedUnits: prop.occupied_units_count || 0,
        openTickets: prop.open_tickets_count || 0,
        highPriorityTickets: prop.high_priority_tickets_count || 0,
        manager: prop.manager_name || "Unassigned",
        status: (prop.status || "healthy").toLowerCase(),
        lastActivity: "N/A",
        pendingApprovals: 0,
        upcomingMaintenance: 0,
      }));

      setProperties(transformed);
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch properties",
      );
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
    console.log("Properties:", properties);
  };

  useEffect(() => {
    fetchProperties();
    fetchStats();
  }, []);

  // Filter properties based on search
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const query = searchQuery.toLowerCase();
      return (
        property.name.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        property.manager.toLowerCase().includes(query)
      );
    });
  }, [properties, searchQuery]);

  const handleRowClick = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "healthy") return "🟢";
    if (lowerStatus === "attention") return "🟡";
    return "🔴";
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    const colors: Record<string, string> = {
      healthy: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      attention: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
      critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return colors[lowerStatus] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const getStatusLabel = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "attention") return "Attention Needed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Create property
  const createProperty = async () => {
    // Validate required fields
    if (
      !newPropertyForm.name ||
      !newPropertyForm.address ||
      !newPropertyForm.total_units
    ) {
      toast.error("Please fill in all required fields (Name, Address, Units)");
      return;
    }

    try {
      setCreating(true);

      const payload: Record<string, any> = {
        name: newPropertyForm.name,
        address: newPropertyForm.address,
        total_units: parseInt(newPropertyForm.total_units),
      };

      // Add optional fields if provided
      if (newPropertyForm.city) payload.city = newPropertyForm.city;
      if (newPropertyForm.state) payload.state = newPropertyForm.state;
      if (newPropertyForm.zip) payload.zip = newPropertyForm.zip;
      if (newPropertyForm.manager_name)
        payload.manager_name = newPropertyForm.manager_name;
      if (newPropertyForm.status) payload.status = newPropertyForm.status;

      console.log("Creating property with payload:", payload);

      const response = await fetch(`${API_BASE_URL}/properties`, {
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
        throw new Error(`Failed to create property: ${response.status}`);
      }

      const createdProperty = await response.json();
      console.log("Property created:", createdProperty);

      // Refresh properties list
      await fetchProperties();

      // Reset form and close modal
      setNewPropertyForm({
        name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        total_units: "",
        manager_name: "",
        status: "healthy",
      });
      setShowNewPropertyModal(false);

      toast.success("Property created successfully");
    } catch (err) {
      console.error("Failed to create property:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create property";
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
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and monitor all properties
          </p>
        </div>

        {/* New Property Button */}
        <div>
          <Button
            onClick={() => setShowNewPropertyModal(true)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + New Property
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Properties Card */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:border-blue-800 dark:from-blue-950/50 dark:to-blue-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total Properties
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                    {stats.total_properties}
                  </p>
                </div>
                <Home className="size-10 text-blue-300 dark:text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Active Issues Card */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-50/50 dark:border-orange-800 dark:from-orange-950/50 dark:to-orange-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Active Issues
                  </p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-400 mt-2">
                    {stats.active_issues}
                  </p>
                </div>
                <AlertCircle className="size-10 text-orange-300 dark:text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {/* High Priority Issues Card */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 dark:border-red-800 dark:from-red-950/50 dark:to-red-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    High-Priority Issues
                  </p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2">
                    {stats.high_priority_issues}
                  </p>
                </div>
                <AlertTriangle className="size-10 text-red-300 dark:text-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments Card */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:border-purple-800 dark:from-purple-950/50 dark:to-purple-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Upcoming Appointments
                  </p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400 mt-2">
                    {stats.upcoming_appointments}
                  </p>
                </div>
                <Calendar className="size-10 text-purple-300 dark:text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* SLA Risks Card */}
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-rose-50/50 dark:border-rose-800 dark:from-rose-950/50 dark:to-rose-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    SLA Risks
                  </p>
                  <p className="text-3xl font-bold text-rose-700 dark:text-rose-400 mt-2">
                    {stats.sla_risks}
                  </p>
                </div>
                <CheckCircle className="size-10 text-rose-300 dark:text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center border border-input rounded-md px-3 bg-background">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search properties by name, address, or manager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 text-sm px-3"
              />
            </div>
          </CardContent>
        </Card>

        {/* Properties Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading properties...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg m-4">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                  Failed to load properties
                </p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
                <Button size="sm" onClick={fetchProperties} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {properties.length === 0
                    ? "No properties found"
                    : "No properties match your search"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-accent/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Property
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Address
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Units
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Occupied
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Open Tickets
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        High Priority
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Manager
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProperties.map((property: Property) => (
                      <tr
                        key={property.id}
                        className="hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(property)}
                      >
                        <td className="px-4 py-2.5 font-semibold text-primary">
                          {property.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {property.address}
                        </td>
                        <td className="px-4 py-2.5 font-semibold">
                          {property.units}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold">
                              {property.occupiedUnits}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {property.units}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {property.openTickets > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 rounded font-semibold">
                              🟡 {property.openTickets}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-2.5 ${property.highPriorityTickets > 0 ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 font-bold" : "text-gray-600 dark:text-gray-400"}`}
                        >
                          {property.highPriorityTickets > 0 ? (
                            <span>🔴 {property.highPriorityTickets}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">{property.manager}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1.5 ${getStatusColor(
                              property.status,
                            )}`}
                          >
                            {getStatusIcon(property.status)}{" "}
                            {getStatusLabel(property.status)}
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

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground">
          Showing {filteredProperties.length} of {properties.length} properties
        </div>
      </div>

      {/* New Property Modal */}
      {showNewPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Card className="w-full max-w-2xl mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Property</h2>
                <button
                  onClick={() => setShowNewPropertyModal(false)}
                  disabled={creating}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Required Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Property Name *
                    </label>
                    <Input
                      placeholder="e.g., Sunset Tower"
                      value={newPropertyForm.name}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          name: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Total Units *
                    </label>
                    <Input
                      placeholder="e.g., 24"
                      type="number"
                      value={newPropertyForm.total_units}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          total_units: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Street Address *
                  </label>
                  <Input
                    placeholder="e.g., 123 Main St"
                    value={newPropertyForm.address}
                    onChange={(e) =>
                      setNewPropertyForm({
                        ...newPropertyForm,
                        address: e.target.value,
                      })
                    }
                    disabled={creating}
                  />
                </div>

                {/* Location Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      City
                    </label>
                    <Input
                      placeholder="e.g., New York"
                      value={newPropertyForm.city}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          city: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      State
                    </label>
                    <Input
                      placeholder="e.g., NY"
                      value={newPropertyForm.state}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          state: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      ZIP Code
                    </label>
                    <Input
                      placeholder="e.g., 10001"
                      value={newPropertyForm.zip}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          zip: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                </div>

                {/* Manager and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Manager Name
                    </label>
                    <Input
                      placeholder="e.g., John Doe"
                      value={newPropertyForm.manager_name}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          manager_name: e.target.value,
                        })
                      }
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Status
                    </label>
                    <select
                      value={newPropertyForm.status}
                      onChange={(e) =>
                        setNewPropertyForm({
                          ...newPropertyForm,
                          status: e.target.value,
                        })
                      }
                      disabled={creating}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="healthy">Healthy</option>
                      <option value="attention">Attention Needed</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
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
                  onClick={() => setShowNewPropertyModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createProperty}
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {creating ? "Creating..." : "Create Property"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          isOpen={isModalOpen}
          property={selectedProperty as any}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
          onDeleted={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
            fetchProperties();
            fetchStats();
          }}
        />
      )}
    </SimpleLayout>
  );
}
