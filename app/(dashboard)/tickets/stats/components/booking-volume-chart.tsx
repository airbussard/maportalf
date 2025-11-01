'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { GroupBy } from '@/app/actions/calendar-stats'
import { useState } from 'react'

interface BookingVolumeChartProps {
  data: {
    period: string
    count: number
    displayLabel: string
  }[]
  groupBy: GroupBy
}

// Flighthour Logo Colors
const FLIGHTHOUR_YELLOW = '#FDB71A'  // Primary brand yellow
const DARKER_YELLOW = '#E5A515'       // 15% darker for non-current months

export function BookingVolumeChart({ data, groupBy }: BookingVolumeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Get current month in YYYY-MM format
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Buchungen im gewählten Zeitraum
      </div>
    )
  }

  // Determine the fill color for each bar
  const getBarFill = (entry: { period: string }, index: number) => {
    // Hover takes precedence
    if (hoveredIndex === index) {
      return FLIGHTHOUR_YELLOW
    }
    // Current month is highlighted
    if (entry.period === currentMonth) {
      return FLIGHTHOUR_YELLOW
    }
    // All other months
    return DARKER_YELLOW
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        onMouseMove={(state) => {
          if (state.isTooltipActive) {
            setHoveredIndex(state.activeTooltipIndex ?? null)
          } else {
            setHoveredIndex(null)
          }
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
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
          radius={[4, 4, 0, 0]}
          name="Buchungen"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarFill(entry, index)}
              style={{ transition: 'fill 0.2s ease' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
