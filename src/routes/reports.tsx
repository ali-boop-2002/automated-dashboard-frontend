import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth-guard";
import { authFetch, API_BASE_URL as LIB_API_BASE } from "@/lib/api";

export const Route = createFileRoute("/reports")({
  beforeLoad: requireAuth,
  component: ReportsPage,
});

const API_BASE_URL = env.VITE_API_BASE_URL;

// ============= TYPES =============
interface Property {
  id: number;
  name: string;
  address: string;
}

interface ReportAnalytics {
  summary: {
    total_revenue: number;
    total_revenue_change_pct: number;
    occupancy_rate_pct: number;
    occupancy_display: string;
    avg_resolution_days: number;
    avg_resolution_change_pct: number;
    open_tickets_count: number;
    overdue_tickets_count: number;
  };
  revenue_expense_trend: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
  maintenance_cost_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  tickets_by_category: Array<{
    category: string;
    ticket_count: number;
    avg_resolution_days: number;
  }>;
  property_performance: Array<{
    property_name: string;
    unit_label: string;
    occupancy_pct: number;
    revenue: number;
    maintenance_cost: number;
    issues: number;
  }>;
  technician_performance: Array<{
    technician: string;
    tickets: number;
    completed: number;
    overdue: number;
    avg_days: number;
  }>;
  outstanding_payments: Array<{
    tenant_label: string;
    amount_due: number;
    status: string;
    days_overdue: number | null;
  }>;
  tenant_analytics: Array<{
    unit_label: string;
    maintenance_requests: number;
    late_payments: number;
    avg_resolution_days: number;
  }>;
}

// ============= COLOR CONSTANTS =============
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

// ============= UTILITY FUNCTIONS =============
function buildReportParams(
  dateRange: string,
  selectedProperty: string,
  selectedTechnician: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (dateRange !== "custom") {
    const days = parseInt(dateRange, 10);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    params.append("start_date", startDate.toISOString().split("T")[0]);
    params.append("end_date", endDate.toISOString().split("T")[0]);
  }
  if (selectedProperty !== "all")
    params.append("property_id", selectedProperty);
  if (selectedTechnician !== "all")
    params.append("technician", selectedTechnician);
  return params;
}

const TrendIndicator = ({
  value,
  isNegativeBad = true,
}: {
  value: number;
  isNegativeBad?: boolean;
}) => {
  const isPositive = value > 0;
  const isGood = isNegativeBad ? value < 0 : value > 0;

  return (
    <span
      className={`flex items-center gap-1 text-sm font-semibold ${isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
    >
      {isPositive ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
};

const KPICard = ({
  title,
  value,
  unit,
  trend,
  description,
  bgColor,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string };
  description?: string;
  bgColor?: string;
}) => {
  return (
    <Card className={bgColor || "bg-white dark:bg-card"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
              {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
            </p>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {trend && (
            <TrendIndicator
              value={trend.value}
              isNegativeBad={trend.label.includes("Avg")}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============= MAIN REPORTS COMPONENT =============
function ReportsPage() {
  const [dateRange, setDateRange] = useState("90");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [reportData, setReportData] = useState<ReportAnalytics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);

  const handleDownloadReport = async (format: "pdf" | "csv") => {
    try {
      setDownloading(format);
      const params = buildReportParams(
        dateRange,
        selectedProperty,
        selectedTechnician,
      );
      const url = `${API_BASE_URL}/reports/analytics/${format}${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await authFetch(url);
      if (!response.ok)
        throw new Error(`Failed to download ${format.toUpperCase()}`);
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `report.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success(`${format.toUpperCase()} report downloaded`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Failed to download ${format.toUpperCase()}`;
      toast.error(msg);
    } finally {
      setDownloading(null);
    }
  };

  // Fetch properties for the filter dropdown (needed for property_id)
  useEffect(() => {
    fetch(`${API_BASE_URL}/properties`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProperties)
      .catch(() => setProperties([]));
  }, []);

  // Fetch report data
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        // Add date range filter
        if (dateRange !== "custom") {
          const days = parseInt(dateRange);
          const endDate = new Date();
          const startDate = new Date(
            endDate.getTime() - days * 24 * 60 * 60 * 1000,
          );
          params.append("start_date", startDate.toISOString().split("T")[0]);
          params.append("end_date", endDate.toISOString().split("T")[0]);
        }

        // Add property filter
        if (selectedProperty !== "all") {
          params.append("property_id", selectedProperty);
        }

        // Add technician filter
        if (selectedTechnician !== "all") {
          params.append("technician", selectedTechnician);
        }

        const url = `${API_BASE_URL}/reports/analytics${params.toString() ? `?${params.toString()}` : ""}`;
        console.log("Fetching reports from:", url);

        const response = await authFetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.status}`);
        }

        const data: ReportAnalytics = await response.json();
        console.log("Fetched report data:", data);
        setReportData(data);
      } catch (err) {
        console.error("Error fetching reports:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch reports";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [dateRange, selectedProperty, selectedTechnician]);

  if (loading) {
    return (
      <SimpleLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </SimpleLayout>
    );
  }

  if (error || !reportData) {
    return (
      <SimpleLayout>
        <div className="p-8">
          <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Error Loading Reports
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  {error || "Unknown error"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Property management performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport("pdf")}
              disabled={downloading !== null}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              {downloading === "pdf" ? "Downloading..." : "PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport("csv")}
              disabled={downloading !== null}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              {downloading === "csv" ? "Downloading..." : "CSV"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last Year</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name || p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Technicians</option>
                  {reportData.technician_performance.map((t) => (
                    <option key={t.technician} value={t.technician}>
                      {t.technician}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange("90");
                    setSelectedProperty("all");
                    setSelectedTechnician("all");
                  }}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={`$${reportData.summary.total_revenue.toLocaleString()}`}
            trend={{
              value: reportData.summary.total_revenue_change_pct,
              label: "Revenue Change",
            }}
            bgColor="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/50 dark:to-blue-950/30"
          />
          <KPICard
            title="Occupancy Rate"
            value={`${reportData.summary.occupancy_rate_pct.toFixed(1)}%`}
            description={reportData.summary.occupancy_display}
            bgColor="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/50 dark:to-green-950/30"
          />
          <KPICard
            title="Avg Resolution Time"
            value={reportData.summary.avg_resolution_days.toFixed(1)}
            unit="days"
            trend={{
              value: -reportData.summary.avg_resolution_change_pct,
              label: "Avg Resolution",
            }}
            bgColor="bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/50 dark:to-purple-950/30"
          />
          <KPICard
            title="Open & Overdue"
            value={`${reportData.summary.open_tickets_count} / ${reportData.summary.overdue_tickets_count}`}
            description="Open / Overdue tickets"
            bgColor="bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/50 dark:to-orange-950/30"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Expense Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Revenue & Expense Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.revenue_expense_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Maintenance Cost Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Maintenance Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.maintenance_cost_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ index }) => {
                      const item = reportData.maintenance_cost_breakdown[index];
                      return item
                        ? `${item.category}: ${item.percentage}%`
                        : "";
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {reportData.maintenance_cost_breakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tickets by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.tickets_by_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="ticket_count"
                  fill="#3b82f6"
                  name="Ticket Count"
                />
                <Bar
                  dataKey="avg_resolution_days"
                  fill="#10b981"
                  name="Avg Resolution Days"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Property Performance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Property Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-accent/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">
                      Property
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Occupancy
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Revenue
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Maintenance
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Issues
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.property_performance.map((prop, i) => (
                    <tr
                      key={`${prop.property_name}-${prop.unit_label ?? ""}-${i}`}
                      className="hover:bg-accent/20"
                    >
                      <td className="px-3 py-2 font-medium">
                        {prop.property_name}
                      </td>
                      <td className="px-3 py-2">{prop.occupancy_pct}%</td>
                      <td className="px-3 py-2">
                        ${prop.revenue.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        ${prop.maintenance_cost.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{prop.issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Technician Performance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Technician Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-accent/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">
                      Technician
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Total Tickets
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Completed
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Overdue
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Avg Days
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.technician_performance.map((tech) => (
                    <tr key={tech.technician} className="hover:bg-accent/20">
                      <td className="px-3 py-2 font-medium">
                        {tech.technician}
                      </td>
                      <td className="px-3 py-2">{tech.tickets}</td>
                      <td className="px-3 py-2">{tech.completed}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            tech.overdue > 0
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-green-600 dark:text-green-400"
                          }
                        >
                          {tech.overdue}
                        </span>
                      </td>
                      <td className="px-3 py-2">{tech.avg_days.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Payments Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outstanding Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-accent/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">
                      Tenant
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Amount Due
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Status
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Days Overdue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.outstanding_payments.map((payment) => (
                    <tr
                      key={payment.tenant_label}
                      className="hover:bg-accent/20"
                    >
                      <td className="px-3 py-2 font-medium">
                        {payment.tenant_label}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        ${payment.amount_due.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            payment.status === "Paid"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : payment.status === "Vacant"
                                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {payment.days_overdue || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Analytics Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tenant Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-accent/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Unit</th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Maintenance Requests
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Late Payments
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Avg Resolution
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.tenant_analytics.map((tenant) => (
                    <tr key={tenant.unit_label} className="hover:bg-accent/20">
                      <td className="px-3 py-2 font-medium">
                        {tenant.unit_label}
                      </td>
                      <td className="px-3 py-2">
                        {tenant.maintenance_requests}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            tenant.late_payments > 0
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-green-600 dark:text-green-400 font-semibold"
                          }
                        >
                          {tenant.late_payments}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {tenant.avg_resolution_days.toFixed(1)} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}
