'use client'

import { StatusBadge } from '@/components/nextadmin'

interface TeamWorkloadTableProps {
  data: { employeeName: string; ticketCount: number }[]
}

export function TeamWorkloadTable({ data }: TeamWorkloadTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  const totalTickets = data.reduce((sum, item) => sum + item.ticketCount, 0)

  const getWorkloadVariant = (count: number) => {
    const pct = (count / totalTickets) * 100
    if (pct >= 30) return 'error' as const
    if (pct >= 15) return 'warning' as const
    return 'success' as const
  }

  const getWorkloadLabel = (count: number) => {
    const pct = (count / totalTickets) * 100
    if (pct >= 30) return 'Hoch'
    if (pct >= 15) return 'Mittel'
    return 'Niedrig'
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-t bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-medium [&>th]:text-muted-foreground">
          <th className="pl-7.5 text-left w-12">#</th>
          <th className="text-left min-w-[150px]">Mitarbeiter</th>
          <th className="text-center">Tickets</th>
          <th className="text-center">Anteil</th>
          <th className="pr-7.5 text-right">Auslastung</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => {
          const percentage = ((item.ticketCount / totalTickets) * 100).toFixed(1)
          return (
            <tr key={item.employeeName} className="border-b border-border text-base font-medium text-foreground">
              <td className="py-4 pl-7.5 text-muted-foreground">
                {index + 1}
              </td>
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#fbb928] text-zinc-900 text-xs font-bold shrink-0">
                    {item.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <span>{item.employeeName}</span>
                </div>
              </td>
              <td className="py-4 text-center font-bold">{item.ticketCount}</td>
              <td className="py-4 text-center text-muted-foreground">{percentage}%</td>
              <td className="py-4 pr-7.5 text-right">
                <StatusBadge variant={getWorkloadVariant(item.ticketCount)}>
                  {getWorkloadLabel(item.ticketCount)}
                </StatusBadge>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
