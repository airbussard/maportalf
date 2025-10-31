'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { GroupBy } from '@/app/actions/calendar-stats'

interface BookingVolumeChartProps {
  data: {
    period: string
    count: number
    displayLabel: string
  }[]
  groupBy: GroupBy
}

export function BookingVolumeChart({ data, groupBy }: BookingVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Buchungen im gewählten Zeitraum
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="displayLabel"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          angle={groupBy === 'week' ? -45 : 0}
          textAnchor={groupBy === 'week' ? 'end' : 'middle'}
          height={groupBy === 'week' ? 80 : 30}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          formatter={(value: number) => [value, 'Buchungen']}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          name="Buchungen"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
