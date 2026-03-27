import { Suspense } from 'react'
import { AuthPage } from './components/auth-page'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-11 w-full bg-muted rounded-xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    }>
      <AuthPage />
    </Suspense>
  )
}
