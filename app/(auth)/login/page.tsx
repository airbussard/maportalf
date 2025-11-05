import { Suspense } from 'react'
import { LoginForm } from './components/login-form'
import { LoginFormSkeleton } from './components/login-form-skeleton'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
