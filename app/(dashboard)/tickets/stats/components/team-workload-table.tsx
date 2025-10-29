'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TeamWorkloadTableProps {
  data: {
    employeeName: string
    ticketCount: number
  }[]
}

export function TeamWorkloadTable({ data }: TeamWorkloadTableProps) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  // Calculate total for percentage
  const totalTickets = data.reduce((sum, item) => sum + item.ticketCount, 0)

  // Determine workload level for color coding
  const getWorkloadLevel = (count: number, total: number) => {
    const percentage = (count / total) * 100
    if (percentage >= 30) return 'high'
    if (percentage >= 15) return 'medium'
    return 'low'
  }

  const getWorkloadBadgeVariant = (level: string): 'destructive' | 'default' | 'secondary' => {
    switch (level) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Rang</TableHead>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead className="text-right">Tickets</TableHead>
            <TableHead className="text-right">Anteil</TableHead>
            <TableHead className="text-right">Auslastung</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const percentage = ((item.ticketCount / totalTickets) * 100).toFixed(1)
            const workloadLevel = getWorkloadLevel(item.ticketCount, totalTickets)
            const badgeVariant = getWorkloadBadgeVariant(workloadLevel)

            return (
              <TableRow key={item.employeeName}>
                <TableCell className="font-medium text-muted-foreground">
                  #{index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {item.employeeName}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {item.ticketCount}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {percentage}%
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={badgeVariant}>
                    {workloadLevel === 'high' && 'Hoch'}
                    {workloadLevel === 'medium' && 'Mittel'}
                    {workloadLevel === 'low' && 'Niedrig'}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
