import { ReactNode, useState } from 'react'
import { useNavigate, Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ChatSidebar } from '@/components/chat-sidebar'
import { 
  LogOut, 
  Home, 
  Ticket, 
  CheckSquare, 
  Building2, 
  Calendar, 
  BarChart3, 
  Zap, 
  FileText,
  MessageCircle,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

interface SimpleLayoutProps {
  children: ReactNode
}

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

export function SimpleLayout({ children }: SimpleLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleLogout = () => {
    // In a real app, you'd clear auth tokens here
    navigate({ to: '/login' })
  }

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home className="size-5" />, href: '/' },
    { label: 'Tickets', icon: <Ticket className="size-5" />, href: '/tickets' },
    { label: 'Approvals', icon: <CheckSquare className="size-5" />, href: '/approvals' },
    { label: 'Properties', icon: <Building2 className="size-5" />, href: '/properties' },
    { label: 'Calendar', icon: <Calendar className="size-5" />, href: '/calendar' },
    { label: 'Reports', icon: <BarChart3 className="size-5" />, href: '/reports' },
    { label: 'Automations', icon: <Zap className="size-5" />, href: '/automations' },
    { label: 'Audit Logs', icon: <FileText className="size-5" />, href: '/audit-logs' },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background flex flex-col">
        {/* Logo/Brand */}
        <div className="h-16 border-b flex items-center px-6">
          <div className="text-lg font-bold">AI Ops</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t p-4">
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2 justify-center"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          <div className="text-lg font-semibold">Dashboard</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="size-4" />
              <span>Chat</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}