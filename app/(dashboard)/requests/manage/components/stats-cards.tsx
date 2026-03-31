/**
 * Request Stats Cards Component
 *
 * Displays work request statistics using NextAdmin StatCard
 * Used in management dashboard
 */

import { Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/nextadmin'
import type { WorkRequestStats } from '@/lib/types/work-requests'

interface StatsCardsProps {
  stats: WorkRequestStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-7.5">
      <StatCard
        label="Ausstehend"
        value={stats.pending}
        icon={Clock}
        iconColor="#FF9C55"
        iconBg="#FF9C5515"
      />
      <StatCard
        label="Heute genehmigt"
        value={stats.approvedToday}
        icon={CheckCircle}
        iconColor="#219653"
        iconBg="#21965315"
      />
      <StatCard
        label="Dieser Monat"
        value={stats.totalMonth}
        icon={Calendar}
        iconColor="#3C50E0"
        iconBg="#3C50E015"
      />
      <StatCard
        label="Dieses Jahr"
        value={stats.totalYear}
        icon={TrendingUp}
        iconColor="#9333EA"
        iconBg="#9333EA15"
      />
    </div>
  )
}
