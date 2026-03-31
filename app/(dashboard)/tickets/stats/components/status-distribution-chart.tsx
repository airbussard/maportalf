'use client'

import type { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface StatusDistributionChartProps {
  data: { status: string; count: number; percentage: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  open: '#F23030',
  in_progress: '#FF9C55',
  pending: '#FFA70B',
  resolved: '#219653',
  closed: '#6B7280',
  low: '#219653',
  medium: '#FFA70B',
  high: '#FF9C55',
  urgent: '#F23030',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  pending: 'Wartend',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[310px] items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  const labels = data.map(d => STATUS_LABELS[d.status] || d.status)
  const series = data.map(d => d.count)
  const colors = data.map(d => STATUS_COLORS[d.status] || '#6B7280')

  const options: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    colors,
    labels,
    legend: {
      show: true,
      position: 'bottom',
      itemMargin: { horizontal: 10, vertical: 5 },
      fontFamily: 'inherit',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          background: 'transparent',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: 'Gesamt',
              fontSize: '14px',
              fontWeight: '400',
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 'bold',
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    responsive: [
      { breakpoint: 640, options: { chart: { width: '100%' } } },
      { breakpoint: 370, options: { chart: { width: 260 } } },
    ],
  }

  return (
    <div className="grid place-items-center">
      <Chart options={options} series={series} type="donut" height={310} />
    </div>
  )
}
