import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '@/hooks/useTheme'

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="system" storageKey="portugal-running-theme">
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    </ThemeProvider>
  ),
})