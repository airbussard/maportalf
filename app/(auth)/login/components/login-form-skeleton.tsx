import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Anmelden</CardTitle>
        <CardDescription>
          Geben Sie Ihre Email und Passwort ein, um sich anzumelden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="h-10 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-40 mx-auto bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  )
}
