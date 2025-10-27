/**
 * Request Stats Cards Component
 *
 * Displays work request statistics in card format
 * Used in management dashboard
 */

import { Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkRequestStats } from '@/lib/types/work-requests'

interface StatsCardsProps {
  stats: WorkRequestStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Ausstehend',
      value: stats.pending,
      icon: Clock,
      description: 'Warten auf Genehmigung',
      color: 'text-yellow-600 dark:text-yellow-500'
    },
    {
      title: 'Heute genehmigt',
      value: stats.approvedToday,
      icon: CheckCircle,
      description: 'Genehmigungen heute',
      color: 'text-green-600 dark:text-green-500'
    },
    {
      title: 'Dieser Monat',
      value: stats.totalMonth,
      icon: Calendar,
      description: 'Requests diesen Monat',
      color: 'text-blue-600 dark:text-blue-500'
    },
    {
      title: 'Dieses Jahr',
      value: stats.totalYear,
      icon: TrendingUp,
      description: 'Requests dieses Jahr',
      color: 'text-purple-600 dark:text-purple-500'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
