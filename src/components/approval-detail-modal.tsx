import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  User,
  FileText,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";

const API_BASE_URL = env.VITE_API_BASE_URL;

interface Approval {
  id: string;
  type: "Refund" | "Credit" | "Vendor Payment" | string;
  relatedTicket: string;
  property: string;
  amount: number;
  requestedBy: string;
  age: number;
  status: "Pending" | "Approved" | "Rejected" | string;
  dueTime: string;
  reason?: string;
  policy?: string;
  context?: string;
  ticket_id?: number;
}

interface ApprovalDetailModalProps {
  isOpen: boolean;
  approval: Approval;
  ticketId?: number;
  propertyId?: number;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}

export function ApprovalDetailModal({
  isOpen,
  approval,
  ticketId,
  propertyId,
  onClose,
  onApprove,
  onReject,
}: ApprovalDetailModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketIssue, setTicketIssue] = useState<string | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState<string | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);

  useEffect(() => {
    if (!isOpen || !ticketId) {
      setTicketIssue(null);
      return;
    }
    let cancelled = false;
    const fetchTicket = async () => {
      setLoadingTicket(true);
      setTicketIssue(null);
      try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
        if (!res.ok) throw new Error("Failed to fetch ticket");
        const data = await res.json();
        if (!cancelled) setTicketIssue(data.issue ?? "");
      } catch {
        if (!cancelled) setTicketIssue(null);
      } finally {
        if (!cancelled) setLoadingTicket(false);
      }
    };
    fetchTicket();
    return () => {
      cancelled = true;
    };
  }, [isOpen, ticketId]);

  useEffect(() => {
    if (!isOpen || !propertyId) {
      setPropertyAddress(null);
      return;
    }
    let cancelled = false;
    const fetchProperty = async () => {
      setLoadingProperty(true);
      setPropertyAddress(null);
      try {
        const res = await fetch(`${API_BASE_URL}/properties/${propertyId}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        const data = await res.json();
        if (!cancelled)
          setPropertyAddress(data.address ?? data.name ?? "Unknown");
      } catch {
        if (!cancelled) setPropertyAddress(null);
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    };
    fetchProperty();
    return () => {
      cancelled = true;
    };
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  const handleApprove = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onApprove("");
      setIsProcessing(false);
    }, 600);
  };

  const handleReject = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onReject("");
      setIsProcessing(false);
    }, 600);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Refund:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      Credit:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      "Vendor Payment":
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    };
    return (
      colors[type] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      Approved:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      Rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header - z-10 so it stays above scrolling content */}
        <div className="border-b p-6 flex items-center justify-between sticky top-0 z-10 bg-background">
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              Approval ID
            </p>
            <h2 className="text-2xl font-bold mt-1">{approval.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Info Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Type</p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${getTypeColor(
                  approval.type,
                )}`}
              >
                {approval.type}
              </span>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Status
              </p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${getStatusColor(
                  approval.status,
                )}`}
              >
                {approval.status}
              </span>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Amount
              </p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-2">
                ${approval.amount.toLocaleString()}
              </p>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Due Time
              </p>
              <p
                className={`font-semibold mt-2 ${
                  approval.dueTime === "OVERDUE"
                    ? "text-red-700 dark:text-red-400"
                    : "text-green-700 dark:text-green-400"
                }`}
              >
                {approval.dueTime}
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Context Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Why Approval is Needed - shows ticket issue */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Why Approval is Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTicket ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader className="size-4 animate-spin" />
                      Loading ticket details...
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">
                      {ticketIssue ??
                        approval.reason ??
                        "No ticket details available"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Related Ticket */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4" />
                    Related Ticket
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Ticket ID:
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {approval.relatedTicket}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Property:
                      </span>
                      {loadingProperty ? (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Loader className="size-3 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <span className="text-sm">
                          {propertyAddress ?? approval.property ?? "Unknown"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Requested By:
                      </span>
                      <span className="text-sm">{approval.requestedBy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Policy Rules Applied */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Policy Rules Applied
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{approval.policy}</p>
                </CardContent>
              </Card>

              {/* AI Context Summary */}
              <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    AI-Generated Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{approval.context}</p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Decision Panel */}
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Approve Button */}
                  <Button
                    onClick={handleApprove}
                    disabled={
                      isProcessing ||
                      approval.status?.toLowerCase() !== "pending"
                    }
                    className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white flex items-center justify-center gap-2 h-10"
                  >
                    <CheckCircle className="size-4" />
                    <span>✅ Approve</span>
                  </Button>

                  {/* Reject Button */}
                  <Button
                    onClick={handleReject}
                    disabled={
                      isProcessing ||
                      approval.status?.toLowerCase() !== "pending"
                    }
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 flex items-center justify-center gap-2 h-10"
                  >
                    <XCircle className="size-4" />
                    <span>❌ Reject</span>
                  </Button>

                  {approval.status?.toLowerCase() !== "pending" && (
                    <div className="p-3 rounded-md bg-accent text-center">
                      <p className="text-xs font-medium text-muted-foreground">
                        This approval has already been{" "}
                        {approval.status.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Impact Preview */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    Impact Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        •
                      </span>
                      <span>Issue {approval.type.toLowerCase()}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        •
                      </span>
                      <span>Close related ticket</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        •
                      </span>
                      <span>Notify tenant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        •
                      </span>
                      <span>Log decision in audit trail</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Audit History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4" />
                Audit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <User className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {approval.requestedBy}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested approval
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {approval.age} hours ago
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        🤖
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Recommendation</p>
                    <p className="text-xs text-muted-foreground">
                      AI recommends approval based on policy compliance
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated immediately upon request
                    </p>
                  </div>
                </div>

                {approval.status !== "Pending" && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-full ${
                          approval.status === "Approved"
                            ? "bg-green-100 dark:bg-green-900/50"
                            : "bg-red-100 dark:bg-red-900/50"
                        }`}
                      >
                        {approval.status === "Approved" ? (
                          <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="size-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{approval.status}</p>
                      <p className="text-xs text-muted-foreground">
                        Decision was made by manager
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Just now
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
