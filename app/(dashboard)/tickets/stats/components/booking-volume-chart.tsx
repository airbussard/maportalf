'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import type { GroupBy, BookingDataPoint } from '@/app/actions/calendar-stats'
import { useState } from 'react'

interface BookingVolumeChartProps {
  data: BookingDataPoint[]
  groupBy: GroupBy
  showComparison?: boolean
}

const FLIGHTHOUR_YELLOW = '#FDB71A'
const DARKER_YELLOW = '#E5A515'
const PREV_YEAR_COLOR = '#94a3b8' // slate-400

export function BookingVolumeChart({ data, groupBy, showComparison = false }: BookingVolumeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Keine Buchungen im gewählten Zeitraum
      </div>
    )
  }

  const hasPreviousData = showComparison && data.some(d => (d.previousCount ?? 0) > 0)

  const getBarFill = (entry: { period: string }, index: number) => {
    if (hoveredIndex === index) return FLIGHTHOUR_YELLOW
    if (entry.period === currentMonth) return FLIGHTHOUR_YELLOW
    return DARKER_YELLOW
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const current = payload.find((p: any) => p.dataKey === 'count')
    const previous = payload.find((p: any) => p.dataKey === 'previousCount')
    const dataPoint = data.find(d => d.displayLabel === label)

    return (
      <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md text-sm">
        <p className="font-medium mb-1">{label}</p>
        {current && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FLIGHTHOUR_YELLOW }} />
            <span>Aktuell: <strong>{current.value}</strong></span>
          </div>
        )}
        {previous && hasPreviousData && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PREV_YEAR_COLOR }} />
            <span>Vorjahr: <strong>{previous.value}</strong></span>
          </div>
        )}
        {dataPoint?.changePercent !== undefined && dataPoint?.changePercent !== null && hasPreviousData && (
          <p className={`text-xs mt-1 font-medium ${dataPoint.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {dataPoint.changePercent >= 0 ? '+' : ''}{dataPoint.changePercent}% vs. Vorjahr
          </p>
        )}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        onMouseMove={(state) => {
          if (state.isTooltipActive) {
            setHoveredIndex(typeof state.activeTooltipIndex === 'number' ? state.activeTooltipIndex : null)
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
        <Tooltip content={<CustomTooltip />} />

        {hasPreviousData && (
          <Bar
            dataKey="previousCount"
            radius={[4, 4, 0, 0]}
            name="Vorjahr"
            fill={PREV_YEAR_COLOR}
            opacity={0.35}
          />
        )}

        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Buchungen">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarFill(entry, index)}
              style={{ transition: 'fill 0.2s ease' }}
            />
          ))}
        </Bar>

        {hasPreviousData && (
          <Legend
            formatter={(value) => value === 'previousCount' ? 'Vorjahr' : 'Aktuell'}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
