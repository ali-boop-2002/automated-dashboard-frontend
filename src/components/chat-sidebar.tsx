import { useState } from 'react'
import { X, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  id: number
  sender: 'user' | 'bot'
  message: string
  timestamp: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      message: 'Hello! How can I help you with your automation tasks today?',
      timestamp: '10:30 AM',
    },
    {
      id: 2,
      sender: 'user',
      message: 'What is the status of ticket #1823?',
      timestamp: '10:32 AM',
    },
    {
      id: 3,
      sender: 'bot',
      message: 'Ticket #1823 is currently in progress. It was assigned to the Database team and is expected to be completed by end of day.',
      timestamp: '10:32 AM',
    },
  ])

  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        sender: 'user',
        message: inputValue,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages([...messages, newMessage])
      setInputValue('')

      // Simulate bot response
      setTimeout(() => {
        const botResponse: ChatMessage = {
          id: messages.length + 2,
          sender: 'bot',
          message: 'I understand. I am processing your request. Is there anything else I can help you with?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botResponse])
      }, 1000)
    }
  }

  return (
    <>
      {/* Chat Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen w-96 bg-background border-l flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-foreground'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              className="h-9 w-9"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by AI Automation Assistant
          </p>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
    </>
  )
}

