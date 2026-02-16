import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/contexts/theme-context'
import { ThemeAwareToaster } from './theme-toaster'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Outlet />
        <ThemeAwareToaster />
      </div>
    </ThemeProvider>
  )
}

