'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface StatusDistributionChartProps {
  data: {
    status: string
    count: number
    percentage: number
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  'open': '#ef4444',       // red
  'in_progress': '#f59e0b', // amber
  'pending': '#eab308',    // yellow
  'resolved': '#22c55e',   // green
  'closed': '#6b7280',     // gray
  'low': '#22c55e',        // green (for priority)
  'medium': '#f59e0b',     // amber
  'high': '#ef4444',       // red
  'urgent': '#dc2626'      // dark red
}

const STATUS_LABELS: Record<string, string> = {
  'open': 'Offen',
  'in_progress': 'In Bearbeitung',
  'pending': 'Wartend',
  'resolved': 'Gelöst',
  'closed': 'Geschlossen',
  'low': 'Niedrig',
  'medium': 'Mittel',
  'high': 'Hoch',
  'urgent': 'Dringend'
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  // Format data for the chart
  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    percentage: item.percentage.toFixed(1)
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => {
            const originalStatus = data[index].status
            const color = STATUS_COLORS[originalStatus] || '#64748b'
            return <Cell key={`cell-${index}`} fill={color} />
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value} Tickets (${props.payload.percentage}%)`,
            name
          ]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
