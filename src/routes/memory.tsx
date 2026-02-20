import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  FileText,
  Trash2,
  Loader,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { authFetch, API_BASE_URL } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { toast } from "sonner";
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

export const Route = createFileRoute("/memory")({
  beforeLoad: requireAuth,
  component: MemoryPage,
});

interface DocListItem {
  doc_id: string;
  filename: string;
  content_type?: string;
  source_type?: string;
  chunk_count?: number;
  pdf_sha256?: string;
  created_at: string;
}

interface DocDetail {
  doc_id: string;
  filename: string;
  chunk_count: number;
  text: string;
}

function MemoryPage() {
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch document list
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/pinecone/docs`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Failed to fetch documents");
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load documents";
      toast.error(msg);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch full text for one doc
  const openDoc = async (doc: DocListItem) => {
    try {
      setLoadingDetail(true);
      setSelectedDoc(null);
      const res = await authFetch(`${API_BASE_URL}/pinecone/docs/${doc.doc_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Failed to fetch document");
      }
      const data: DocDetail = await res.json();
      setSelectedDoc(data);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load document";
      toast.error(msg);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Delete document
  const confirmDelete = (doc: DocListItem) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      setDeleting(true);
      const res = await authFetch(
        `${API_BASE_URL}/pinecone/docs/${docToDelete.doc_id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Failed to delete document");
      }
      toast.success("Document deleted");
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      if (selectedDoc?.doc_id === docToDelete.doc_id) {
        setSelectedDoc(null);
      }
      await fetchDocuments();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to delete document";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  };

  return (
    <SimpleLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="size-6" />
            Memory
          </h1>
          <p className="text-muted-foreground mt-1">
            Documents indexed in your Knowledge Base. Click to view full text or
            delete.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Your Documents
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Documents uploaded via the chat sidebar
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="size-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No documents yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload documents from the Chat sidebar to add them here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => openDoc(doc)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <FileText className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.chunk_count ?? "—"} chunks •{" "}
                            {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(doc);
                        }}
                        title="Delete document"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Detail / Full Text */}
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDoc
                  ? selectedDoc.filename
                  : "Click a document to view its full text"}
              </p>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedDoc ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedDoc.chunk_count} chunks</span>
                  </div>
                  <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-[400px] whitespace-pre-wrap font-sans">
                    {selectedDoc.text || "(No text content)"}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      confirmDelete({
                        doc_id: selectedDoc.doc_id,
                        filename: selectedDoc.filename,
                        created_at: "",
                        chunk_count: selectedDoc.chunk_count,
                      })
                    }
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete this document
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="size-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Select a document to view its content
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{docToDelete?.filename}"? This
              will remove it from Pinecone and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SimpleLayout>
  );
}
