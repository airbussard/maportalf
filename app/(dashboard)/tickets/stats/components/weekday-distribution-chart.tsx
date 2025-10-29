'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface WeekdayDistributionChartProps {
  data: {
    weekday: string
    count: number
  }[]
}

export function WeekdayDistributionChart({ data }: WeekdayDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  // Shorten weekday names for better display
  const chartData = data.map(item => ({
    weekday: item.weekday.substring(0, 2), // Mo, Di, Mi, etc.
    fullWeekday: item.weekday,
    count: item.count
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="weekday"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          labelFormatter={(value, payload) => {
            const item = payload[0]?.payload
            return item?.fullWeekday || value
          }}
          formatter={(value: number) => [`${value} Tickets`, 'Anzahl']}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
