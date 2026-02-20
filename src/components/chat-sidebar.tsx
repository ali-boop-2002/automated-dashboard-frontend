import { useState, useRef, useEffect } from "react";
import { X, MessageCircle, Send, ImageIcon, Loader, AlertCircle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";

// Pinecone upload: pdf, docx, txt, csv, png, jpg, webp, gif. Max 20 MB
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.txt,.csv,image/png,image/jpeg,image/webp,image/gif";
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  message: string;
  timestamp: string;
  type?: "text" | "image";
  imagePreview?: string;
  error?: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "bot",
      message:
        "Hello! I'm your AI assistant. Chat with me, upload an image for analysis, or add documents to the Knowledge Base.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate timestamp
  const getTimestamp = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle text chat
  const handleSendMessage = async () => {
    const messageText = inputValue.trim();
    if (!messageText && !selectedImage && !selectedDocument) return;

    // If there's a document, handle Pinecone upload
    if (selectedDocument) {
      await handleDocumentUpload();
      return;
    }

    // If there's an image, handle image upload
    if (selectedImage) {
      await handleImageUpload(messageText);
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      message: messageText,
      timestamp: getTimestamp(),
      type: "text",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail ?? `Request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: data.reply,
        timestamp: getTimestamp(),
        type: "text",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: getTimestamp(),
        type: "text",
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (promptText?: string) => {
    if (!selectedImage) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(selectedImage.type)) {
      toast.error("Please select an image (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedImage.size > maxSize) {
      toast.error(`Image too large: ${(selectedImage.size / 1024 / 1024).toFixed(1)} MB. Max size: 10 MB.`);
      return;
    }

    // Add user message with image preview
    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      message: promptText || "Analyze this image",
      timestamp: getTimestamp(),
      type: "image",
      imagePreview: imagePreview!,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      if (promptText?.trim()) {
        formData.append("prompt", promptText.trim());
      }

      const response = await authFetch(`${API_BASE_URL}/ai/scan-data`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type - browser will set it with boundary
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail ?? `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response with analysis
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: data.analysis,
        timestamp: getTimestamp(),
        type: "text",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze image";
      toast.error(errorMessage);
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: `Sorry, I couldn't analyze the image: ${errorMessage}`,
        timestamp: getTimestamp(),
        type: "text",
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setSelectedImage(file);
    };
    reader.readAsDataURL(file);
  };

  // Clear selected image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle document selection for Pinecone upload
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!DOCUMENT_MIME_TYPES.includes(file.type)) {
      toast.error(
        "Invalid file type. Allowed: PDF, DOCX, TXT, CSV, PNG, JPG, WebP, GIF",
      );
      if (documentInputRef.current) documentInputRef.current.value = "";
      return;
    }

    if (file.size > DOCUMENT_MAX_BYTES) {
      toast.error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max size: 20 MB.`,
      );
      if (documentInputRef.current) documentInputRef.current.value = "";
      return;
    }

    setSelectedDocument(file);
  };

  // Clear selected document
  const clearDocument = () => {
    setSelectedDocument(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  // Handle document upload to Pinecone
  const handleDocumentUpload = async () => {
    if (!selectedDocument) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      message: `Uploading document: ${selectedDocument.name}`,
      timestamp: getTimestamp(),
      type: "text",
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedDocument);

      const response = await authFetch(`${API_BASE_URL}/pinecone/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail ?? `Upload failed: ${response.status}`);
      }

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: [
          data.message,
          `Doc ID: ${data.doc_id}`,
          `Chunks indexed: ${data.chunks_indexed}`,
          data.pdf_stored_in_pinecone
            ? "PDF content stored in Pinecone metadata."
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        timestamp: getTimestamp(),
        type: "text",
      };
      setMessages((prev) => [...prev, botMessage]);
      toast.success("Document indexed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload document";
      toast.error(errorMessage);

      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "bot",
        message: `Sorry, I couldn't index the document: ${errorMessage}`,
        timestamp: getTimestamp(),
        type: "text",
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      clearDocument();
    }
  };

  return (
    <>
      {/* Chat Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen w-96 bg-background border-l flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } z-50`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 border-b px-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.error
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-accent text-foreground"
                }`}
              >
                {msg.type === "image" && msg.imagePreview && (
                  <img
                    src={msg.imagePreview}
                    alt="Uploaded"
                    className="w-full rounded mb-2 max-h-48 object-cover"
                  />
                )}
                {msg.error && (
                  <div className="flex items-start gap-2 mb-1">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">Error</p>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === "user"
                      ? "text-primary-foreground/70"
                      : msg.error
                      ? "text-destructive/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-accent text-foreground px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader className="size-4 animate-spin" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded border max-h-32 object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={clearImage}
              >
                <X className="size-3" />
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedImage?.name}
              </p>
            </div>
          )}

          {/* Document Preview */}
          {selectedDocument && (
            <div className="flex items-center justify-between rounded border bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileUp className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedDocument.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedDocument.size / 1024).toFixed(1)} KB • Index to
                    Knowledge Base
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={clearDocument}
              >
                <X className="size-3" />
              </Button>
            </div>
          )}

          {/* Input Row */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={handleDocumentSelect}
              className="hidden"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !!selectedImage || !!selectedDocument}
              className="h-9 w-9 shrink-0"
              title="Upload image for analysis"
            >
              <ImageIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => documentInputRef.current?.click()}
              disabled={loading || !!selectedImage || !!selectedDocument}
              className="h-9 w-9 shrink-0"
              title="Upload document to Knowledge Base (PDF, DOCX, TXT, CSV, images)"
            >
              <FileUp className="size-4" />
            </Button>
            <Input
              placeholder={
                selectedImage
                  ? "Add a prompt (optional)..."
                  : selectedDocument
                  ? "Click Send to index document"
                  : "Ask me anything..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
              className="text-sm flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={
                loading ||
                (!inputValue.trim() && !selectedImage && !selectedDocument)
              }
              className="h-9 w-9 shrink-0"
            >
              {loading ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground">
            Powered by ChatGPT • Image analysis • Document indexing
          </p>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}
    </>
  );
}
