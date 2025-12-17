'use client'

import { MaydayDashboard } from './components/mayday-dashboard'

export default function MaydayCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MAYDAY Center</h1>
        <p className="text-muted-foreground">
          Notfall-Terminmanagement für kurzfristige Verschiebungen und Absagen
        </p>
      </div>

      <MaydayDashboard />
    </div>
  )
}
